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

const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
};

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

type BiometricDevice = "morpho" | "mantra";

const DEVICE_OPTIONS: { value: BiometricDevice; label: string }[] = [
  { value: "mantra", label: "Mantra (MFS100)" },
  { value: "morpho", label: "Morpho (MSO 1300 E2 / E3)" },
];

// CRITICAL: These are the EXACT URLs that the working test page uses
const RD_SERVICE_URLS = {
  mantra: [
    "https://127.0.0.1:11100",
    "http://127.0.0.1:11100", 
    "https://127.0.0.1:8005",
    "http://127.0.0.1:8005",
  ],
  morpho: [
    "https://127.0.0.1:11100",
    "http://127.0.0.1:11100",
  ],
};

const CAPTURE_PID_OPTIONS = `<?xml version="1.0"?>
<PidOptions ver="1.0">
<Opts fCount="1" fType="2" iCount="0" pCount="0" format="0" pidVer="2.0" timeout="10000" posh="UNKNOWN" env="P" wadh="" />
<CustOpts><Param name="mantrakey" value="" /></CustOpts>
</PidOptions>`;

// Simple XHR POST - no custom headers
function makeXHRCall(url: string, method: string, data: string = ""): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open(method, url, true);
      xhr.timeout = 10000;

      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            resolve(xhr.responseText);
          } else if (xhr.status === 0) {
            reject(new Error("Connection failed"));
          } else {
            reject(new Error(`HTTP ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => reject(new Error("Network error"));
      xhr.ontimeout = () => reject(new Error("Timeout"));

      xhr.send(data);
    } catch (err: any) {
      reject(err);
    }
  });
}

async function discoverDevice(device: BiometricDevice): Promise<string | null> {
  const urls = RD_SERVICE_URLS[device];

  for (const baseUrl of urls) {
    try {
      console.log(`[Bio] Trying: ${baseUrl}`);
      await makeXHRCall(`${baseUrl}/rd/info`, "RDSERVICE");
      console.log(`[Bio] ✓ Found at: ${baseUrl}`);
      return baseUrl;
    } catch (err: any) {
      console.log(`[Bio] ✗ ${baseUrl}: ${err.message}`);
    }
  }

  return null;
}

async function captureFingerprint(
  device: BiometricDevice,
  baseUrl: string | null
): Promise<string> {
  const urls = baseUrl 
    ? [baseUrl, ...RD_SERVICE_URLS[device].filter(u => u !== baseUrl)]
    : RD_SERVICE_URLS[device];

  for (const url of urls) {
    try {
      console.log(`[Bio] Capture: ${url}/rd/capture`);
      const response = await makeXHRCall(`${url}/rd/capture`, "CAPTURE", CAPTURE_PID_OPTIONS);
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(response, "text/xml");
      const resp = doc.querySelector("Resp");
      const errCode = resp?.getAttribute("errCode") || "";

      if (errCode !== "0") {
        const errInfo = resp?.getAttribute("errInfo") || "Capture failed";
        throw new Error(`${errInfo} (${errCode})`);
      }

      console.log(`[Bio] ✓ Success`);
      return response;
    } catch (err: any) {
      console.log(`[Bio] ✗ ${url}: ${err.message}`);
    }
  }

  throw new Error(
    "Unable to capture fingerprint.\n\n" +
    "Please ensure:\n" +
    "• RD Service is running (check Services)\n" +
    "• Device is connected via USB\n" +
    "• No other app is using the device"
  );
}

function requestGeolocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error("Location permission denied. Please allow location and refresh."));
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          reject(new Error("Location unavailable"));
        } else if (err.code === err.TIMEOUT) {
          reject(new Error("Location timeout"));
        } else {
          reject(new Error("Location error"));
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  });
}

enum Step {
  ENTER_MOBILE,
  AADHAAR_BIOMETRIC,
  OTP_VERIFY,
  SUCCESS,
}

export default function DmtPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [retailerId, setRetailerId] = useState("");
  const [step, setStep] = useState<Step>(Step.ENTER_MOBILE);

  const [mobileNumber, setMobileNumber] = useState("");
  const [aadharNumber, setAadharNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [ekycId, setEkycId] = useState("");
  const [stateResp, setStateResp] = useState("");

  const [selectedDevice, setSelectedDevice] = useState<BiometricDevice>("mantra");
  const [pidData, setPidData] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState<"unknown" | "checking" | "ready" | "not_found">("unknown");
  const discoveredUrl = useRef<string | null>(null);

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<"pending" | "fetching" | "success" | "error">("pending");
  const [locationError, setLocationError] = useState<string | null>(null);
  const locationRequested = useRef(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast({ title: "Error", description: "Please login again", variant: "destructive" });
      return;
    }
    try {
      const decoded: JwtPayload = jwtDecode(token);
      // @ts-ignore
      const userId = decoded.retailer_id || decoded.data?.user_id || decoded.user_id;
      if (!userId) {
        toast({ title: "Error", description: "Unable to identify user", variant: "destructive" });
        return;
      }
      setRetailerId(userId);
    } catch {
      toast({ title: "Error", description: "Session expired", variant: "destructive" });
    }

    if (!locationRequested.current) {
      locationRequested.current = true;
      setLocationStatus("fetching");
      requestGeolocation()
        .then((coords) => {
          setLatitude(coords.lat);
          setLongitude(coords.lng);
          setLocationStatus("success");
          toast({ title: "Location Captured", description: `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` });
        })
        .catch((err: Error) => {
          setLocationStatus("error");
          setLocationError(err.message);
          toast({ title: "Location Required", description: err.message, variant: "destructive" });
        });
    }
  }, [toast]);

  useEffect(() => {
    if (step !== Step.AADHAAR_BIOMETRIC) return;

    let cancelled = false;
    setDeviceStatus("checking");
    setPidData("");
    discoveredUrl.current = null;

    discoverDevice(selectedDevice).then((url) => {
      if (cancelled) return;
      discoveredUrl.current = url;
      setDeviceStatus(url ? "ready" : "not_found");
    });

    return () => {
      cancelled = true;
    };
  }, [selectedDevice, step]);

  const clearError = () => setError(null);

  const retryLocation = useCallback(async () => {
    setLocationStatus("fetching");
    setLocationError(null);
    try {
      const coords = await requestGeolocation();
      setLatitude(coords.lat);
      setLongitude(coords.lng);
      setLocationStatus("success");
      toast({ title: "Location Captured", description: `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` });
    } catch (err: any) {
      setLocationStatus("error");
      setLocationError(err.message);
    }
  }, [toast]);

  const handleMobileSubmit = useCallback(async () => {
    if (!retailerId) {
      toast({ title: "Error", description: "User ID not found", variant: "destructive" });
      return;
    }
    if (locationStatus !== "success") {
      toast({ title: "Location Required", description: "Please allow location", variant: "destructive" });
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
        toast({ title: "Wallet Found", description: "Redirecting to beneficiary" });
        navigate("/dmt/beneficiary", { state: { mobileNumber } });
        return;
      }

      setStep(Step.AADHAAR_BIOMETRIC);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Error";
      setError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [mobileNumber, retailerId, locationStatus, toast, navigate]);

  const handleCaptureFingerprint = useCallback(async () => {
    setCapturing(true);
    clearError();

    try {
      const pid = await captureFingerprint(selectedDevice, discoveredUrl.current);
      setPidData(pid);
      toast({ title: "Success", description: "Fingerprint captured successfully" });
    } catch (err: any) {
      setError(err.message);
      toast({ title: "Capture Failed", description: err.message, variant: "destructive" });
    } finally {
      setCapturing(false);
    }
  }, [selectedDevice, toast]);

  const handleCreateWallet = useCallback(async () => {
    console.log("=== CREATE WALLET START ===");
    console.log("Timestamp:", new Date().toISOString());
    
    // Step 1: Validate PID data
    if (!pidData) {
      console.error("❌ Validation failed: No PID data");
      setError("Please capture fingerprint first");
      return;
    }
    console.log("✅ PID data present:", pidData.length, "bytes");
    console.log("PID data preview:", pidData.substring(0, 200) + "...");
    
    // Step 2: Validate location
    if (latitude === null || longitude === null) {
      console.error("❌ Validation failed: Location not available");
      console.log("Latitude:", latitude);
      console.log("Longitude:", longitude);
      setError("Location not available");
      return;
    }
    console.log("✅ Location available:", { latitude, longitude });

    clearError();
    setLoading(true);
function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

    // Step 3: Prepare request payload
    const requestPayload = {
      retailer_id: retailerId,
      mobile_no: mobileNumber,
      lat: latitude,
      long: longitude,
      aadhar_number: aadharNumber,
      pid_data: toBase64(pidData),
      is_iris: 2,
    };


    console.log("📤 Request payload:", {
      retailer_id: retailerId,
      mobile_no: mobileNumber,
      lat: latitude,
      long: longitude,
      aadhar_number: aadharNumber,
      pid_data: toBase64(pidData),
      is_iris: 2,
    });

    console.log("🌐 API endpoint:", `${API_BASE_URL}/dmt/create/wallet`);
    console.log("🔑 Auth headers:", getAuthHeaders());

    try {
      console.log("⏳ Sending request...");
      const startTime = Date.now();
      
      const res = await axios.post<CreateWalletResponse>(
        `${API_BASE_URL}/dmt/create/wallet`,
        requestPayload,
        getAuthHeaders()
      );
      
      const duration = Date.now() - startTime;
      console.log(`✅ Response received in ${duration}ms`);
      console.log("📥 Full response:", JSON.stringify(res.data, null, 2));
      
      const createRes = res.data?.data?.response;
      console.log("📊 Response data:", createRes);

      // Step 4: Check response error code
      if (createRes?.error !== 0) {
        console.error("❌ API returned error:", {
          error: createRes?.error,
          msg: createRes?.msg,
          Description: createRes?.Description,
          AccountExists: createRes?.AccountExists,
        });
        
        const errorMsg = createRes?.Description || createRes?.msg || "Failed to create wallet";
        console.error("Error message to display:", errorMsg);
        setError(errorMsg);
        setLoading(false);
        return;
      }

      // Step 5: Success
      console.log("✅ Wallet creation successful!");
      console.log("Account created:", createRes?.AccountExists);
      console.log("Message:", createRes?.msg);
      
      toast({ title: "OTP Sent", description: "Check your mobile" });
      
      console.log("🔄 Moving to OTP verification step");
      setStep(Step.OTP_VERIFY);
      
    } catch (err: any) {
      console.error("=== CREATE WALLET ERROR ===");
      console.error("Error type:", err.constructor.name);
      console.error("Error message:", err.message);
      
      if (err.response) {
        console.error("❌ HTTP Error Response:");
        console.error("Status:", err.response.status);
        console.error("Status text:", err.response.statusText);
        console.error("Headers:", err.response.headers);
        console.error("Data:", JSON.stringify(err.response.data, null, 2));
      } else if (err.request) {
        console.error("❌ No response received:");
        console.error("Request:", err.request);
      } else {
        console.error("❌ Request setup error:", err.message);
      }
      
      console.error("Full error object:", err);
      console.error("Error stack:", err.stack);
      
      const msg = err.response?.data?.message || err.message || "Error";
      console.error("Error message to display:", msg);
      
      setError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
      
    } finally {
      setLoading(false);
      console.log("=== CREATE WALLET END ===");
    }
  }, [retailerId, mobileNumber, latitude, longitude, aadharNumber, pidData, toast]);

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
        setError(verifyRes?.description || verifyRes?.msg || "Verification failed");
        setLoading(false);
        return;
      }

      toast({ title: "Success", description: "Wallet created successfully!" });
      setStep(Step.SUCCESS);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Error";
      setError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [mobileNumber, retailerId, otp, ekycId, stateResp, toast]);

  const handleBackToServices = useCallback(() => navigate("/services"), [navigate]);
  const handleGoToBeneficiary = useCallback(() => navigate("/dmt/beneficiary", { state: { mobileNumber } }), [navigate, mobileNumber]);
  const handleBackToStep1 = useCallback(() => {
    clearError();
    setPidData("");
    setStep(Step.ENTER_MOBILE);
  }, []);
  const handleBackToBiometric = useCallback(() => {
    clearError();
    setStep(Step.AADHAAR_BIOMETRIC);
  }, []);

  const handleMobileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    clearError();
    setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10));
  }, []);
  const handleAadharChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    clearError();
    setAadharNumber(e.target.value.replace(/\D/g, "").slice(0, 12));
  }, []);
  const handleOtpChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    clearError();
    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
  }, []);
  const handleEkycIdChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    clearError();
    setEkycId(e.target.value);
  }, []);
  const handleStateRespChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    clearError();
    setStateResp(e.target.value);
  }, []);

  const renderLocationBanner = () => {
    if (locationStatus === "fetching") {
      return (
        <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-md px-3 py-2 mb-4">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          Fetching location…
        </div>
      );
    }
    if (locationStatus === "success" && latitude !== null && longitude !== null) {
      return (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-4">
          <MapPin className="w-4 h-4 shrink-0" />
          Location: {latitude.toFixed(4)}, {longitude.toFixed(4)}
        </div>
      );
    }
    if (locationStatus === "error") {
      return (
        <div className="flex items-center justify-between gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">
          <div className="flex items-center gap-2">
            <MapPinOff className="w-4 h-4 shrink-0" />
            <span>{locationError || "Location unavailable"}</span>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={retryLocation} className="text-red-700 hover:bg-red-100 text-xs px-2 py-1 h-auto">
            Retry
          </Button>
        </div>
      );
    }
    return null;
  };

  const renderStepIndicator = () => {
    const steps = ["Mobile", "Biometric", "OTP", "Done"];
    const currentIndex = step === Step.ENTER_MOBILE ? 0 : step === Step.AADHAAR_BIOMETRIC ? 1 : step === Step.OTP_VERIFY ? 2 : 3;

    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {steps.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                i < currentIndex ? "paybazaar-gradient text-white" : i === currentIndex ? "paybazaar-gradient text-white ring-4 ring-offset-2 ring-slate-300" : "bg-slate-200 text-slate-500"
              }`}
            >
              {i < currentIndex ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-xs hidden sm:inline ${i === currentIndex ? "font-semibold" : "text-muted-foreground"}`}>{label}</span>
            {i < steps.length - 1 && <div className={`w-8 h-0.5 rounded ${i < currentIndex ? "paybazaar-gradient" : "bg-slate-200"}`} />}
          </div>
        ))}
      </div>
    );
  };

  const renderEnterMobile = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 mb-3">
          <Smartphone className="w-7 h-7 text-slate-600" />
        </div>
        <h2 className="text-lg font-semibold">Enter Mobile Number</h2>
        <p className="text-sm text-muted-foreground mt-1">We'll check if a wallet exists or create one.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mobile">Mobile Number <span className="text-red-500">*</span></Label>
        <Input id="mobile" type="tel" placeholder="9876543210" value={mobileNumber} onChange={handleMobileChange} maxLength={10} required />
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}

      <Button
        type="button"
        onClick={handleMobileSubmit}
        disabled={loading || mobileNumber.length !== 10 || !retailerId || locationStatus !== "success"}
        className="w-full paybazaar-gradient text-white font-medium py-3"
      >
        {loading ? (
          <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Checking…</span>
        ) : !retailerId ? "Loading…" : locationStatus !== "success" ? "Waiting for Location…" : "Continue"}
      </Button>
    </div>
  );

  const renderAadhaarBiometric = () => (
    <div className="space-y-5">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 mb-3">
          <Fingerprint className="w-7 h-7 text-slate-600" />
        </div>
        <h2 className="text-lg font-semibold">Aadhaar Biometric</h2>
        <p className="text-sm text-muted-foreground mt-1">For mobile: <span className="font-semibold">{mobileNumber}</span></p>
      </div>

      <div className="space-y-1">
        <Label>Mobile Number</Label>
        <Input value={mobileNumber} readOnly className="bg-slate-50 cursor-not-allowed" />
      </div>

      <div className="space-y-1">
        <Label htmlFor="aadhar">Aadhaar Number <span className="text-red-500">*</span></Label>
        <Input id="aadhar" type="tel" placeholder="123456789012" value={aadharNumber} onChange={handleAadharChange} maxLength={12} required />
        {aadharNumber.length > 0 && aadharNumber.length < 12 && <p className="text-xs text-amber-600">Enter complete 12-digit Aadhaar</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="device-select">Biometric Device <span className="text-red-500">*</span></Label>
        <select
          id="device-select"
          value={selectedDevice}
          onChange={(e) => setSelectedDevice(e.target.value as BiometricDevice)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {DEVICE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <div className="mt-1">
          {deviceStatus === "checking" && (
            <p className="text-xs text-blue-600 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Detecting RD Service…
            </p>
          )}
          {deviceStatus === "ready" && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> RD Service detected
              {discoveredUrl.current && <span className="text-slate-400 ml-1">({discoveredUrl.current})</span>}
            </p>
          )}
          {deviceStatus === "not_found" && (
            <p className="text-xs text-amber-600">⚠️ RD Service not detected. Ensure service is running.</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Button
          type="button"
          onClick={handleCaptureFingerprint}
          disabled={capturing || aadharNumber.length !== 12}
          className="w-full bg-slate-800 text-white font-medium py-3"
        >
          {capturing ? (
            <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Place finger…</span>
          ) : pidData ? (
            <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> Captured — Tap to Recapture</span>
          ) : (
            <span className="flex items-center gap-2"><Fingerprint className="w-4 h-4" /> Capture Fingerprint</span>
          )}
        </Button>

        {pidData && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md px-3 py-2">
            <CheckCircle className="w-4 h-4" />
            PID captured ({(pidData.length / 1024).toFixed(1)} KB)
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md px-3 py-2 whitespace-pre-line">{error}</p>}

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={handleBackToStep1} className="flex-1">Back</Button>
        <Button
          type="button"
          onClick={handleCreateWallet}
          disabled={loading || aadharNumber.length !== 12 || !pidData}
          className="flex-1 paybazaar-gradient text-white font-medium py-3"
        >
          {loading ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Creating…</span> : "Create Wallet"}
        </Button>
      </div>
    </div>
  );

  const renderOtpVerify = () => (
    <div className="space-y-5">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 mb-3">
          <Mail className="w-7 h-7 text-slate-600" />
        </div>
        <h2 className="text-lg font-semibold">Verify Wallet</h2>
        <p className="text-sm text-muted-foreground mt-1">For: <span className="font-semibold">{mobileNumber}</span></p>
      </div>

      <div className="space-y-1">
        <Label>Mobile Number</Label>
        <Input value={mobileNumber} readOnly className="bg-slate-50 cursor-not-allowed" />
      </div>

      <div className="space-y-1">
        <Label htmlFor="otp">OTP <span className="text-red-500">*</span></Label>
        <Input id="otp" type="tel" placeholder="Enter OTP" value={otp} onChange={handleOtpChange} maxLength={6} required />
      </div>

      <div className="space-y-1">
        <Label htmlFor="ekycId">eKYC ID <span className="text-red-500">*</span></Label>
        <Input id="ekycId" placeholder="Enter eKYC ID" value={ekycId} onChange={handleEkycIdChange} required />
      </div>

      <div className="space-y-1">
        <Label htmlFor="stateResp">State Response <span className="text-muted-foreground text-xs">(optional)</span></Label>
        <Input id="stateResp" placeholder="State response" value={stateResp} onChange={handleStateRespChange} />
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={handleBackToBiometric} className="flex-1">Back</Button>
        <Button
          type="button"
          onClick={handleVerifySubmit}
          disabled={loading || otp.length < 4 || !ekycId.trim()}
          className="flex-1 paybazaar-gradient text-white font-medium py-3"
        >
          {loading ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</span> : "Verify Wallet"}
        </Button>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="text-center space-y-5 py-4">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100">
        <CheckCircle className="w-10 h-10 text-green-600" />
      </div>
      <div>
        <h2 className="text-xl font-bold">Wallet Created!</h2>
        <p className="text-sm text-muted-foreground mt-1">
          DMT wallet for <span className="font-semibold">{mobileNumber}</span> created successfully.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button type="button" onClick={handleGoToBeneficiary} className="paybazaar-gradient text-white font-medium py-3">Add Beneficiary</Button>
        <Button type="button" variant="outline" onClick={handleBackToServices}>Back to Services</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex w-full">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 space-y-6 overflow-auto">
          <div className="paybazaar-gradient rounded-lg p-6 text-white">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" onClick={handleBackToServices} className="text-white hover:bg-slate-700">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold">{step === Step.SUCCESS ? "Wallet Created" : "Remitter Login"}</h1>
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