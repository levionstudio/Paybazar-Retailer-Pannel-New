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
import { XMLParser } from "fast-xml-parser";

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

const getDeviceUrl = (device: BiometricDevice): string => {
  if (device === "morpho") {
    return "https://localhost:11100/capture";
  } else {
    // mantra
    return "https://127.0.0.1:11100/rd/capture";
  }
};

interface BiometricData {
  pidData: string;      // Full PidData XML
  sessionKey: string;   // Skey field
  hmac: string;         // Hmac field
  data: string;         // Data field (base64 encrypted biometric)
  deviceInfo: any;      // DeviceInfo object
}

// ✅ Capture fingerprint - returns biometric data object
async function captureFingerprint(device: BiometricDevice, wadh: string = "E0jzJ/P8UopUHAieZn8CKqS4WPMi5ZSYXgfnlfkWjrc"): Promise<BiometricData> {
  const captureUrl = getDeviceUrl(device);
  
  // ✅ Standard PID Options format with wadh
  const captureXML = `<PidOptions ver="1.0">
    <Opts fCount="1" fType="0" iCount="0" pCount="0" format="0" pidVer="2.0" timeout="10000" otp="" wadh="${wadh}" posh=""/>
</PidOptions>`;
  
  console.log(`[Bio] Capturing from: ${captureUrl}`);
  console.log(`[Bio] PID Options:`, captureXML);

  try {
    // ✅ Fetch biometric data
    const response = await fetch(captureUrl, {
      method: "CAPTURE",
      headers: { "Content-Type": "application/xml" },
      body: captureXML
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // ✅ Get entire XML text response
    const xmlText = await response.text();
    console.log("[Bio] Response received, length:", xmlText.length);

    // ✅ Parse XML to validate and extract data
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
    });
    
    const parsed = parser.parse(xmlText);
    const pid = parsed.PidData;
    
    console.log("[Bio] Parsed PidData:", pid);

    // Validate response
    if (!pid) {
      throw new Error("Invalid response - PidData not found");
    }

    // Check for errors
    if (pid.Resp && pid.Resp.errCode && pid.Resp.errCode !== "0") {
      const errInfo = pid.Resp.errInfo || "Unknown error";
      throw new Error(`Biometric error: ${errInfo}`);
    }

    console.log("[Bio] ✓ Capture Successful");
    console.log("[Bio] errCode:", pid.Resp?.errCode);
    console.log("[Bio] errInfo:", pid.Resp?.errInfo);
    console.log("[Bio] Quality Score:", pid.Resp?.qScore);
    console.log("[Bio] Minutiae Points:", pid.Resp?.nmPoints);
    
    // ✅ Extract the Data field content (base64 encrypted biometric string)
    // The Data field structure can be: { type: "X", "#text": "base64string" } or just "base64string"
    const dataContent = pid.Data?.["#text"] || pid.Data;
    
    if (!dataContent || typeof dataContent !== "string") {
      throw new Error("Invalid response - Data field not found");
    }
    
    // ✅ Extract session key (Skey)
    const sessionKey = pid.Skey?.["#text"] || pid.Skey || "";
    
    // ✅ Extract HMAC
    const hmac = pid.Hmac?.["#text"] || pid.Hmac || "";
    
    console.log("[Bio] Data field length:", dataContent.length, "chars");
    console.log("[Bio] Data preview:", dataContent.substring(0, 80) + "...");
    console.log("[Bio] Session Key length:", sessionKey.length, "chars");
    console.log("[Bio] HMAC length:", hmac.length, "chars");
    
    // ✅ Return biometric data object
    const biometricData: BiometricData = {
      pidData: xmlText,           // Full XML for reference
      sessionKey: sessionKey,     // Session key
      hmac: hmac,                 // HMAC
      data: dataContent,          // Data field (this is what you send to API)
      deviceInfo: pid.DeviceInfo  // Device info
    };
    
    return biometricData;
    
  } catch (err: any) {
    console.error("[Bio] ✗ Capture failed:", err.message);
    
    // Handle network errors
    if (err.name === "TypeError" && err.message.includes("fetch")) {
      throw new Error("Driver not supported or installed. Please ensure the biometric device driver is running.");
    }
    
    throw err;
  }
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
  const [biometricData, setBiometricData] = useState<BiometricData | null>(null);
  const [capturing, setCapturing] = useState(false);

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
      console.log("=== BIOMETRIC CAPTURE START ===");
      console.log("Device:", selectedDevice);

      // ✅ Capture biometric data with wadh parameter
      // You can get wadh from your configuration or leave empty
      const wadh = ""; // Add your wadh value here if needed
      const bioData = await captureFingerprint(selectedDevice, wadh);

      if (!bioData || !bioData.data) {
        throw new Error("Failed to capture biometric data");
      }

      // ✅ Store the complete biometric data object
      setBiometricData(bioData);

      console.log("✅ Biometric data captured successfully");
      console.log("Data field length:", bioData.data.length, "characters");
      console.log("Session Key length:", bioData.sessionKey.length, "characters");
      console.log("HMAC length:", bioData.hmac.length, "characters");
      console.log("=== BIOMETRIC CAPTURE END ===");

      toast({
        title: "Success",
        description: "Fingerprint captured successfully",
      });

    } catch (err: any) {
      console.error("Capture error:", err);

      const message = err?.message || "Fingerprint capture failed";

      setError(message);

      toast({
        title: "Capture Failed",
        description: message,
        variant: "destructive",
      });

    } finally {
      setCapturing(false);
    }
  }, [selectedDevice, toast]);

  const handleCreateWallet = useCallback(async () => {
    console.log("=== CREATE WALLET API CALL START ===");
    console.log("Timestamp:", new Date().toISOString());
    
    // Validation
    if (!biometricData || !biometricData.data) {
      console.error("❌ No biometric data");
      setError("Please capture fingerprint first");
      return;
    }
    
    if (latitude === null || longitude === null) {
      console.error("❌ No location data");
      setError("Location not available");
      return;
    }

    clearError();
    setLoading(true);

    // ✅ Send ONLY the Data field (base64 encrypted biometric string) to backend
    // This is the encrypted biometric template that will be sent to UIDAI
    const requestPayload = {
      retailer_id: retailerId,
      mobile_no: mobileNumber,
      lat: latitude,
      long: longitude,
      aadhaar_number: aadharNumber,
      pid_data: biometricData.data, // ✅ Only the Data field (base64 string)
      is_iris: 2,
    };

    console.log("📤 API Request:");
    console.log("  Endpoint:", `${API_BASE_URL}/dmt/create/wallet`);
    console.log("  Retailer ID:", retailerId);
    console.log("  Mobile:", mobileNumber);
    console.log("  Aadhaar:", aadharNumber);
    console.log("  Location:", { lat: latitude, long: longitude });
    console.log("  PID Data (Data field) length:", biometricData.data.length, "chars");
    console.log("  PID Data preview:", biometricData.data.substring(0, 80) + "...");
    console.log("  Session Key available:", biometricData.sessionKey.length > 0);
    console.log("  HMAC available:", biometricData.hmac.length > 0);
    console.log("  is_iris:", 2);

    try {
      const startTime = Date.now();
      
      const res = await axios.post<CreateWalletResponse>(
        `${API_BASE_URL}/dmt/create/wallet`,
        requestPayload,
        getAuthHeaders()
      );
      
      const duration = Date.now() - startTime;
      console.log(`✅ Response received in ${duration}ms`);
      console.log("📥 Response:", JSON.stringify(res.data, null, 2));
      
      const createRes = res.data?.data?.response;

      if (createRes?.error !== 0) {
        const errorMsg = createRes?.Description || createRes?.msg || "Failed to create wallet";
        console.error("❌ API Error:", errorMsg);
        console.error("Error Code:", createRes?.error);
        setError(errorMsg);
        setLoading(false);
        return;
      }

      console.log("✅ Wallet creation successful!");
      toast({ title: "OTP Sent", description: "Check your mobile for OTP" });
      setStep(Step.OTP_VERIFY);
      
    } catch (err: any) {
      console.error("=== CREATE WALLET ERROR ===");
      
      if (err.response) {
        console.error("HTTP Status:", err.response.status);
        console.error("Response Data:", JSON.stringify(err.response.data, null, 2));
      } else if (err.request) {
        console.error("No response received");
      } else {
        console.error("Request setup error:", err.message);
      }
      
      const msg = err.response?.data?.message || err.message || "Error creating wallet";
      setError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
      
    } finally {
      setLoading(false);
      console.log("=== CREATE WALLET API CALL END ===");
    }
  }, [retailerId, mobileNumber, latitude, longitude, aadharNumber, biometricData, toast]);

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
    setBiometricData(null);
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
          ) : biometricData ? (
            <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> Captured — Tap to Recapture</span>
          ) : (
            <span className="flex items-center gap-2"><Fingerprint className="w-4 h-4" /> Capture Fingerprint</span>
          )}
        </Button>

        {biometricData && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md px-3 py-2">
            <CheckCircle className="w-4 h-4" />
            Biometric data captured (Data: {biometricData.data.length} chars, Quality: {biometricData.deviceInfo?.Resp?.qScore || 'N/A'})
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md px-3 py-2 whitespace-pre-line">{error}</p>}

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={handleBackToStep1} className="flex-1">Back</Button>
        <Button
          type="button"
          onClick={handleCreateWallet}
          disabled={loading || aadharNumber.length !== 12 || !biometricData}
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