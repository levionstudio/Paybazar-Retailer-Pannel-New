import { useState, useCallback, useEffect, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  CheckCircle,
  Fingerprint,
  Loader2,
  Mail,
  MapPin,
  MapPinOff,
  Smartphone,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { jwtDecode, JwtPayload } from "jwt-decode";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------
const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
};

// ---------------------------------------------------------------------------
// Types – aligned with Go backend models
// ---------------------------------------------------------------------------

interface CheckWalletResponse {
  status: string;
  message: string;
  data: {
    response: {
      error: number;
      msg: string;
      AccountExists: number;
      Description: string;
    };
  };
}

interface CreateWalletResponse {
  status: string;
  message: string;
  data: {
    response: {
      error: number;
      msg: string;
      AccountExists: number;
      Description: string;
    };
  };
}

interface VerifyWalletResponse {
  status: string;
  message: string;
  data: {
    response: {
      error: number;
      msg: string;
      orderid: string;
      partnerreqid: string;
      description: string;
    };
  };
}

// ---------------------------------------------------------------------------
// Biometric device config
// ---------------------------------------------------------------------------
type BiometricDevice = "morpho" | "mantra";

const DEVICE_OPTIONS: { value: BiometricDevice; label: string }[] = [
  { value: "morpho", label: "Morpho (MSO 1300 E2 / E3)" },
  { value: "mantra", label: "Mantra (MFS100)" },
];

// ---------------------------------------------------------------------------
// RD Service URLs to try (in priority order)
// FIXED: HTTP URLs first as they're more common
// ---------------------------------------------------------------------------
const MANTRA_URLS = [
  "http://127.0.0.1:11100/rd",
  "http://127.0.0.1:8005/rd",
  "https://127.0.0.1:11100/rd",
  "https://127.0.0.1:8005/rd",
  "https://127.0.0.1:8004/rd",
];

const MORPHO_URLS = [
  "http://127.0.0.1:11100",
  "https://127.0.0.1:11100",
];

// ---------------------------------------------------------------------------
// Capture PidOptions XML
// ---------------------------------------------------------------------------
const CAPTURE_PID_OPTIONS =
  `<?xml version="1.0"?>` +
  `<PidOptions ver="1.0">` +
  `<Opts fCount="1" fType="2" iCount="0" pCount="0" format="0" ` +
  `pidVer="2.0" timeout="10000" posh="UNKNOWN" env="P" wadh="" />` +
  `<CustOpts><Param name="mantrakey" value="" /></CustOpts>` +
  `</PidOptions>`;

// ---------------------------------------------------------------------------
// FIXED: XMLHttpRequest-based POST helper WITHOUT Content-Type header
// ---------------------------------------------------------------------------
// We use XMLHttpRequest instead of fetch() because many RD Services
// (especially Mantra on port 11100) handle XHR CORS differently from fetch.
// This is the standard approach used by UIDAI-integrated fintech apps.
// 
// CRITICAL FIX: We do NOT set the Content-Type header because it triggers
// a CORS preflight request that the Mantra device doesn't support.
// The browser will automatically use text/plain which works fine.
// ---------------------------------------------------------------------------
function xhrPost(url: string, body: string, timeoutMs = 15000): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    
    // CRITICAL FIX: DO NOT set Content-Type header
    // xhr.setRequestHeader("Content-Type", "text/xml"); // ❌ REMOVED - triggers CORS preflight
    
    xhr.timeout = timeoutMs;

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.responseText);
        } else if (xhr.status === 0) {
          // Network error / CORS blocked / connection refused
          reject(new Error(`Connection failed to ${url}`));
        } else {
          reject(
            new Error(`HTTP ${xhr.status} ${xhr.statusText} from ${url}`)
          );
        }
      }
    };

    xhr.onerror = () => reject(new Error(`Network error connecting to ${url}`));
    xhr.ontimeout = () => reject(new Error(`Request timed out for ${url}`));

    xhr.send(body);
  });
}

function xhrGet(url: string, method = "GET", timeoutMs = 5000): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.timeout = timeoutMs;

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.responseText);
        } else if (xhr.status === 0) {
          reject(new Error(`Connection failed to ${url}`));
        } else {
          reject(
            new Error(`HTTP ${xhr.status} ${xhr.statusText} from ${url}`)
          );
        }
      }
    };

    xhr.onerror = () => reject(new Error(`Network error connecting to ${url}`));
    xhr.ontimeout = () => reject(new Error(`Request timed out for ${url}`));

    xhr.send();
  });
}

// ---------------------------------------------------------------------------
// Discover which RD Service base URL is responding
// ---------------------------------------------------------------------------
async function discoverRdServiceUrl(
  device: BiometricDevice
): Promise<string | null> {
  const baseUrls = device === "morpho" ? MORPHO_URLS : MANTRA_URLS;

  for (const baseUrl of baseUrls) {
    const infoUrl = `${baseUrl}/info`;
    try {
      console.log(`[DMT][Bio] Checking: ${infoUrl}`);
      // Mantra uses RDSERVICE method, but some respond to GET too
      // Try RDSERVICE first, fall back to GET
      try {
        await xhrGet(infoUrl, "RDSERVICE", 3000);
        console.log(`[DMT][Bio] ✓ Discovered RD Service at: ${baseUrl}`);
        return baseUrl;
      } catch {
        await xhrGet(infoUrl, "GET", 3000);
        console.log(`[DMT][Bio] ✓ Discovered RD Service at: ${baseUrl} (GET)`);
        return baseUrl;
      }
    } catch (err: any) {
      console.warn(`[DMT][Bio] ✗ ${infoUrl}: ${err.message}`);
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Capture fingerprint using discovered URL
// ---------------------------------------------------------------------------
async function captureFingerprint(
  device: BiometricDevice,
  discoveredBaseUrl: string | null
): Promise<string> {
  // Build list of capture URLs to try
  let captureUrls: string[];

  if (discoveredBaseUrl) {
    // Use the discovered URL first, then fall back to others
    const allBaseUrls = device === "morpho" ? MORPHO_URLS : MANTRA_URLS;
    const others = allBaseUrls.filter((u) => u !== discoveredBaseUrl);
    captureUrls = [discoveredBaseUrl, ...others].map((base) =>
      `${base}/capture`
    );
  } else {
    captureUrls = (device === "morpho" ? MORPHO_URLS : MANTRA_URLS).map(
      (base) => `${base}/capture`
    );
  }

  const errors: string[] = [];

  for (const url of captureUrls) {
    try {
      console.log(`[DMT][Bio] Capture attempt: ${url}`);
      const responseXml = await xhrPost(url, CAPTURE_PID_OPTIONS, 15000);
      console.log(`[DMT][Bio] Capture response from ${url}, length: ${responseXml.length}`);

      // Parse response
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(responseXml, "text/xml");
      const respNode = xmlDoc.querySelector("Resp");
      const errCode = respNode?.getAttribute("errCode") || "";
      const errInfo = respNode?.getAttribute("errInfo") || "";

      if (errCode && errCode !== "0") {
        throw new Error(
          `Capture error: ${errInfo || "Unknown"} (code: ${errCode})`
        );
      }

      console.log(`[DMT][Bio] ✓ Capture SUCCESS from ${url}`);
      return responseXml;
    } catch (err: any) {
      console.warn(`[DMT][Bio] ✗ Capture failed at ${url}: ${err.message}`);
      errors.push(`${url}: ${err.message}`);
    }
  }

  const deviceName = device === "morpho" ? "Morpho" : "Mantra";
  throw new Error(
    `Unable to capture fingerprint from ${deviceName} device.\n\n` +
      `Please ensure:\n` +
      `• The ${deviceName} RD Service is installed and running\n` +
      `• The biometric device is connected via USB\n` +
      `• No other application is using the device\n\n` +
      `Tried: ${captureUrls.join(", ")}`
  );
}

// ---------------------------------------------------------------------------
// Geolocation
// ---------------------------------------------------------------------------
function requestGeolocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            reject(
              new Error(
                "Location permission denied. Please allow location in browser settings and refresh."
              )
            );
            break;
          case err.POSITION_UNAVAILABLE:
            reject(new Error("Location information unavailable."));
            break;
          case err.TIMEOUT:
            reject(new Error("Location request timed out."));
            break;
          default:
            reject(new Error("Unknown location error."));
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  });
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------
enum Step {
  ENTER_MOBILE,
  AADHAAR_BIOMETRIC,
  OTP_VERIFY,
  SUCCESS,
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function DmtPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // ---- state --------------------------------------------------------------
  const [retailerId, setRetailerId] = useState("");
  const [step, setStep] = useState<Step>(Step.ENTER_MOBILE);

  // form
  const [mobileNumber, setMobileNumber] = useState("");
  const [aadharNumber, setAadharNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [ekycId, setEkycId] = useState("");
  const [stateResp, setStateResp] = useState("");

  // biometric
  const [selectedDevice, setSelectedDevice] =
    useState<BiometricDevice>("mantra");
  const [pidData, setPidData] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState<
    "unknown" | "checking" | "ready" | "not_found"
  >("unknown");
  const discoveredUrl = useRef<string | null>(null);

  // geolocation
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<
    "pending" | "fetching" | "success" | "error"
  >("pending");
  const [locationError, setLocationError] = useState<string | null>(null);
  const locationRequested = useRef(false);

  // ui
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ==================================================================
  // Mount: JWT + geolocation
  // ==================================================================
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast({
        title: "Authentication Error",
        description: "Please login again",
        variant: "destructive",
      });
      return;
    }
    try {
      const decoded: JwtPayload = jwtDecode(token);
      // @ts-ignore
      const userId =
        decoded.retailer_id || decoded.data?.user_id || decoded.user_id;
      if (!userId) {
        toast({
          title: "Error",
          description: "Unable to identify user. Please login again.",
          variant: "destructive",
        });
        return;
      }
      setRetailerId(userId);
    } catch {
      toast({
        title: "Error",
        description: "Session expired. Please login again.",
        variant: "destructive",
      });
    }

    if (!locationRequested.current) {
      locationRequested.current = true;
      setLocationStatus("fetching");
      requestGeolocation()
        .then((coords) => {
          setLatitude(coords.lat);
          setLongitude(coords.lng);
          setLocationStatus("success");
          toast({
            title: "Location Captured",
            description: `Lat: ${coords.lat.toFixed(4)}, Long: ${coords.lng.toFixed(4)}`,
          });
        })
        .catch((err: Error) => {
          setLocationStatus("error");
          setLocationError(err.message);
          toast({
            title: "Location Required",
            description: err.message,
            variant: "destructive",
          });
        });
    }
  }, [toast]);

  // ==================================================================
  // Detect RD Service when device changes on step 2
  // ==================================================================
  useEffect(() => {
    if (step !== Step.AADHAAR_BIOMETRIC) return;

    let cancelled = false;
    setDeviceStatus("checking");
    setPidData("");
    discoveredUrl.current = null;

    discoverRdServiceUrl(selectedDevice).then((url) => {
      if (cancelled) return;
      discoveredUrl.current = url;
      setDeviceStatus(url ? "ready" : "not_found");
    });

    return () => {
      cancelled = true;
    };
  }, [selectedDevice, step]);

  // ---- helpers ------------------------------------------------------------
  const clearError = () => setError(null);

  const retryLocation = useCallback(async () => {
    setLocationStatus("fetching");
    setLocationError(null);
    try {
      const coords = await requestGeolocation();
      setLatitude(coords.lat);
      setLongitude(coords.lng);
      setLocationStatus("success");
      toast({
        title: "Location Captured",
        description: `Lat: ${coords.lat.toFixed(4)}, Long: ${coords.lng.toFixed(4)}`,
      });
    } catch (err: any) {
      setLocationStatus("error");
      setLocationError(err.message);
    }
  }, [toast]);

  // ==================================================================
  // STEP 1 – Check wallet
  // ==================================================================
  const handleMobileSubmit = useCallback(async () => {
    if (!retailerId) {
      toast({
        title: "Error",
        description: "User ID not found. Please login again.",
        variant: "destructive",
      });
      return;
    }
    if (locationStatus !== "success") {
      toast({
        title: "Location Required",
        description: "Please allow location access before proceeding.",
        variant: "destructive",
      });
      return;
    }

    clearError();
    setLoading(true);

    try {
      const res = await axios.post<CheckWalletResponse>(
        `${API_BASE_URL}/dmt/check/wallet`,
        { mobile_no: mobileNumber },
        getAuthHeaders()
      );
      const checkRes = res.data?.data?.response;

      if (checkRes?.AccountExists === 1) {
        toast({
          title: "Wallet Found",
          description: "Wallet already exists. Redirecting to beneficiary.",
        });
        navigate("/dmt/beneficiary", { state: { mobileNumber } });
        return;
      }

      setStep(Step.AADHAAR_BIOMETRIC);
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || "Something went wrong";
      setError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [mobileNumber, retailerId, locationStatus, toast, navigate]);

  // ==================================================================
  // STEP 2a – Capture fingerprint
  // ==================================================================
  const handleCaptureFingerprint = useCallback(async () => {
    setCapturing(true);
    clearError();

    try {
      const pid = await captureFingerprint(selectedDevice, discoveredUrl.current);
      setPidData(pid);
      toast({
        title: "Fingerprint Captured",
        description: "Biometric data captured successfully.",
      });
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Capture Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setCapturing(false);
    }
  }, [selectedDevice, toast]);

  // ==================================================================
  // STEP 2b – Create wallet
  // ==================================================================
  const handleCreateWallet = useCallback(async () => {
    if (!pidData) {
      setError("Please capture fingerprint first.");
      return;
    }
    if (latitude === null || longitude === null) {
      setError("Location not available. Please allow location and refresh.");
      return;
    }

    clearError();
    setLoading(true);

    try {
      const res = await axios.post<CreateWalletResponse>(
        `${API_BASE_URL}/dmt/create/wallet`,
        {
          retailer_id: retailerId,
          mobile_no: mobileNumber,
          lat: latitude,
          long: longitude,
          aadhar_number: aadharNumber,
          pid_data: pidData,
          is_iris: 2,
        },
        getAuthHeaders()
      );
      const createRes = res.data?.data?.response;

      if (createRes?.error !== 0) {
        setError(
          createRes?.Description || createRes?.msg || "Failed to create wallet"
        );
        setLoading(false);
        return;
      }

      toast({
        title: "OTP Sent",
        description: "An OTP has been sent to the registered mobile number.",
      });
      setStep(Step.OTP_VERIFY);
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || "Something went wrong";
      setError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [retailerId, mobileNumber, latitude, longitude, aadharNumber, pidData, toast]);

  // ==================================================================
  // STEP 3 – Verify wallet
  // ==================================================================
  const handleVerifySubmit = useCallback(async () => {
    clearError();
    setLoading(true);

    try {
      const res = await axios.post<VerifyWalletResponse>(
        `${API_BASE_URL}/dmt/verify/wallet`,
        {
          retailer_id: retailerId,
          mobile_no: mobileNumber,
          otp,
          ekyc_id: ekycId,
          stateresp: stateResp,
          partner_request_id: "",
        },
        getAuthHeaders()
      );
      const verifyRes = res.data?.data?.response;

      if (verifyRes?.error !== 0) {
        setError(
          verifyRes?.description || verifyRes?.msg || "Verification failed"
        );
        setLoading(false);
        return;
      }

      toast({
        title: "Success",
        description: "DMT wallet created and verified successfully!",
      });
      setStep(Step.SUCCESS);
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || "Something went wrong";
      setError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [mobileNumber, retailerId, otp, ekycId, stateResp, toast]);

  // ==================================================================
  // Navigation
  // ==================================================================
  const handleBackToServices = useCallback(
    () => navigate("/services"),
    [navigate]
  );
  const handleGoToBeneficiary = useCallback(
    () => navigate("/dmt/beneficiary", { state: { mobileNumber } }),
    [navigate, mobileNumber]
  );
  const handleBackToStep1 = useCallback(() => {
    clearError();
    setPidData("");
    setStep(Step.ENTER_MOBILE);
  }, []);
  const handleBackToBiometric = useCallback(() => {
    clearError();
    setStep(Step.AADHAAR_BIOMETRIC);
  }, []);

  // ==================================================================
  // Input handlers
  // ==================================================================
  const handleMobileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      clearError();
      setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10));
    },
    []
  );
  const handleAadharChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      clearError();
      setAadharNumber(e.target.value.replace(/\D/g, "").slice(0, 12));
    },
    []
  );
  const handleOtpChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      clearError();
      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
    },
    []
  );
  const handleEkycIdChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      clearError();
      setEkycId(e.target.value);
    },
    []
  );
  const handleStateRespChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      clearError();
      setStateResp(e.target.value);
    },
    []
  );

  // ==================================================================
  // UI: Location banner
  // ==================================================================
  const renderLocationBanner = () => {
    if (locationStatus === "fetching") {
      return (
        <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-md px-3 py-2 mb-4">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          Fetching your location…
        </div>
      );
    }
    if (locationStatus === "success" && latitude !== null && longitude !== null) {
      return (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-4">
          <MapPin className="w-4 h-4 shrink-0" />
          Location captured: {latitude.toFixed(4)}, {longitude.toFixed(4)}
        </div>
      );
    }
    if (locationStatus === "error") {
      return (
        <div className="flex items-center justify-between gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">
          <div className="flex items-center gap-2">
            <MapPinOff className="w-4 h-4 shrink-0" />
            <span>{locationError || "Location not available"}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={retryLocation}
            className="text-red-700 hover:text-red-800 hover:bg-red-100 text-xs px-2 py-1 h-auto"
          >
            Retry
          </Button>
        </div>
      );
    }
    return null;
  };

  // ==================================================================
  // UI: Step indicator
  // ==================================================================
  const renderStepIndicator = () => {
    const steps = ["Mobile No.", "Biometric", "Verify OTP", "Done"];
    const currentIndex =
      step === Step.ENTER_MOBILE
        ? 0
        : step === Step.AADHAAR_BIOMETRIC
        ? 1
        : step === Step.OTP_VERIFY
        ? 2
        : 3;

    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {steps.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i < currentIndex
                  ? "paybazaar-gradient text-white"
                  : i === currentIndex
                  ? "paybazaar-gradient text-white ring-4 ring-offset-2 ring-slate-300"
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              {i < currentIndex ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </div>
            <span
              className={`text-xs hidden sm:inline ${
                i === currentIndex
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <div
                className={`w-8 h-0.5 rounded ${
                  i < currentIndex ? "paybazaar-gradient" : "bg-slate-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  // ── STEP 1 ─────────────────────────────────────────────────────────
  const renderEnterMobile = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 mb-3">
          <Smartphone className="w-7 h-7 text-slate-600" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          Enter Mobile Number
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          We'll check if a wallet exists or create a new one.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mobile" className="text-sm font-medium text-foreground">
          Mobile Number <span className="text-red-500">*</span>
        </Label>
        <Input
          id="mobile"
          type="tel"
          placeholder="e.g. 9876543210"
          value={mobileNumber}
          onChange={handleMobileChange}
          className="paybazaar-input"
          maxLength={10}
          required
        />
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <Button
        type="button"
        onClick={handleMobileSubmit}
        disabled={
          loading ||
          mobileNumber.length !== 10 ||
          !retailerId ||
          locationStatus !== "success"
        }
        className="w-full paybazaar-gradient text-white font-medium py-3 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Checking…
          </span>
        ) : !retailerId ? (
          "Loading…"
        ) : locationStatus !== "success" ? (
          "Waiting for Location…"
        ) : (
          "Continue"
        )}
      </Button>
    </div>
  );

  // ── STEP 2 ─────────────────────────────────────────────────────────
  const renderAadhaarBiometric = () => (
    <div className="space-y-5">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 mb-3">
          <Fingerprint className="w-7 h-7 text-slate-600" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          Aadhaar Biometric Verification
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Enter Aadhaar, select device, and capture fingerprint for{" "}
          <span className="font-semibold text-foreground">{mobileNumber}</span>.
        </p>
      </div>

      {/* Mobile read-only */}
      <div className="space-y-1">
        <Label className="text-sm font-medium text-foreground">
          Mobile Number
        </Label>
        <Input
          value={mobileNumber}
          readOnly
          className="paybazaar-input bg-slate-50 text-slate-500 cursor-not-allowed"
        />
      </div>

      {/* Aadhaar */}
      <div className="space-y-1">
        <Label htmlFor="aadhar" className="text-sm font-medium text-foreground">
          Aadhaar Number <span className="text-red-500">*</span>
        </Label>
        <Input
          id="aadhar"
          type="tel"
          placeholder="e.g. 123456789012"
          value={aadharNumber}
          onChange={handleAadharChange}
          className="paybazaar-input"
          maxLength={12}
          required
        />
        {aadharNumber.length > 0 && aadharNumber.length < 12 && (
          <p className="text-xs text-amber-600">
            Enter complete 12-digit Aadhaar number
          </p>
        )}
      </div>

      {/* Device dropdown */}
      <div className="space-y-1">
        <Label
          htmlFor="device-select"
          className="text-sm font-medium text-foreground"
        >
          Select Biometric Device <span className="text-red-500">*</span>
        </Label>
        <select
          id="device-select"
          value={selectedDevice}
          onChange={(e) =>
            setSelectedDevice(e.target.value as BiometricDevice)
          }
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {DEVICE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Device status */}
        <div className="mt-1">
          {deviceStatus === "checking" && (
            <p className="text-xs text-blue-600 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Detecting{" "}
              {selectedDevice === "morpho" ? "Morpho" : "Mantra"} RD Service…
            </p>
          )}
          {deviceStatus === "ready" && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />{" "}
              {selectedDevice === "morpho" ? "Morpho" : "Mantra"} RD Service
              detected
              {discoveredUrl.current && (
                <span className="text-slate-400 ml-1">
                  ({discoveredUrl.current})
                </span>
              )}
            </p>
          )}
          {deviceStatus === "not_found" && (
            <p className="text-xs text-amber-600">
              ⚠️{" "}
              {selectedDevice === "morpho" ? "Morpho" : "Mantra"} RD Service
              not detected. Ensure the service is running, then try capturing.
            </p>
          )}
        </div>
      </div>

      {/* Capture */}
      <div className="space-y-2">
        <Button
          type="button"
          onClick={handleCaptureFingerprint}
          disabled={capturing || aadharNumber.length !== 12}
          className="w-full bg-slate-800 text-white font-medium py-3 rounded-md hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          {capturing ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Place finger on
              device…
            </span>
          ) : pidData ? (
            <span className="flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" /> Fingerprint
              Captured — Tap to Recapture
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Fingerprint className="w-4 h-4" /> Capture Fingerprint
            </span>
          )}
        </Button>

        {pidData && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md px-3 py-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            PID data captured ({(pidData.length / 1024).toFixed(1)} KB)
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md px-3 py-2 whitespace-pre-line">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <Button
          type="button"
          variant="outline"
          onClick={handleBackToStep1}
          className="flex-1 border-slate-300 text-slate-600 hover:bg-slate-50"
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={handleCreateWallet}
          disabled={loading || aadharNumber.length !== 12 || !pidData}
          className="flex-1 paybazaar-gradient text-white font-medium py-3 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Creating Wallet…
            </span>
          ) : (
            "Create Wallet"
          )}
        </Button>
      </div>
    </div>
  );

  // ── STEP 3 ─────────────────────────────────────────────────────────
  const renderOtpVerify = () => (
    <div className="space-y-5">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 mb-3">
          <Mail className="w-7 h-7 text-slate-600" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Verify Wallet</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Enter the OTP and eKYC details for{" "}
          <span className="font-semibold text-foreground">{mobileNumber}</span>.
        </p>
      </div>

      <div className="space-y-1">
        <Label className="text-sm font-medium text-foreground">
          Mobile Number
        </Label>
        <Input
          value={mobileNumber}
          readOnly
          className="paybazaar-input bg-slate-50 text-slate-500 cursor-not-allowed"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="otp" className="text-sm font-medium text-foreground">
          OTP <span className="text-red-500">*</span>
        </Label>
        <Input
          id="otp"
          type="tel"
          placeholder="Enter OTP"
          value={otp}
          onChange={handleOtpChange}
          className="paybazaar-input"
          maxLength={6}
          required
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="ekycId" className="text-sm font-medium text-foreground">
          eKYC ID <span className="text-red-500">*</span>
        </Label>
        <Input
          id="ekycId"
          placeholder="Enter eKYC ID"
          value={ekycId}
          onChange={handleEkycIdChange}
          className="paybazaar-input"
          required
        />
      </div>

      <div className="space-y-1">
        <Label
          htmlFor="stateResp"
          className="text-sm font-medium text-foreground"
        >
          State Response{" "}
          <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Input
          id="stateResp"
          placeholder="State response data"
          value={stateResp}
          onChange={handleStateRespChange}
          className="paybazaar-input"
        />
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <Button
          type="button"
          variant="outline"
          onClick={handleBackToBiometric}
          className="flex-1 border-slate-300 text-slate-600 hover:bg-slate-50"
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={handleVerifySubmit}
          disabled={loading || otp.length < 4 || !ekycId.trim()}
          className="flex-1 paybazaar-gradient text-white font-medium py-3 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Verifying…
            </span>
          ) : (
            "Verify Wallet"
          )}
        </Button>
      </div>
    </div>
  );

  // ── STEP 4 – Success ──────────────────────────────────────────────
  const renderSuccess = () => (
    <div className="text-center space-y-5 py-4">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100">
        <CheckCircle className="w-10 h-10 text-green-600" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-foreground">Wallet Created!</h2>
        <p className="text-sm text-muted-foreground mt-1">
          DMT wallet for{" "}
          <span className="font-semibold text-foreground">{mobileNumber}</span>{" "}
          created and verified successfully.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button
          type="button"
          onClick={handleGoToBeneficiary}
          className="paybazaar-gradient text-white font-medium py-3 rounded-md hover:opacity-90 transition-opacity"
        >
          Add Beneficiary
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleBackToServices}
          className="border-slate-300 text-slate-600 hover:bg-slate-50"
        >
          Back to Services
        </Button>
      </div>
    </div>
  );

  // ==================================================================
  // Layout
  // ==================================================================
  return (
    <div className="min-h-screen bg-background flex w-full">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 space-y-6 overflow-auto">
          <div className="paybazaar-gradient rounded-lg p-6 text-white">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBackToServices}
                className="text-white hover:bg-slate-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold">
                {step === Step.SUCCESS ? "Wallet Created" : "Remitter Login"}
              </h1>
            </div>
          </div>

          <div className="max-w-2xl mx-auto w-full">
            <div className="paybazaar-card p-8">
              {renderLocationBanner()}
              {renderStepIndicator()}

              {step === Step.ENTER_MOBILE && renderEnterMobile()}
              {step === Step.AADHAAR_BIOMETRIC && renderAadhaarBiometric()}
              {step === Step.OTP_VERIFY && renderOtpVerify()}
              {step === Step.SUCCESS && renderSuccess()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}