import { useState, useCallback, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle, Loader2, Mail, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { jwtDecode, JwtPayload } from "jwt-decode";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ---------------------------------------------------------------------------
// Auth helpers – exact same pattern as DTHRecharge
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
// Types
// ---------------------------------------------------------------------------
interface CheckExistsResponse {
  status: string;
  message: string;
  data: {
    response: {
      error: number;
      msg: string;
      FirstName: string;
      LastName: string;
      MobileNo: string;
      Limit: number;
      description: string;
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
      MobileNo: string;
      RequestNo: string;
      description: string;
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
      MobileNo: string;
      description: string;
    };
  };
}

// ---------------------------------------------------------------------------
// Step enum
// ---------------------------------------------------------------------------
enum Step {
  ENTER_MOBILE,     // 1 – user types mobile number
  OTP_AND_DETAILS,  // 2 – OTP + name / address
  SUCCESS,          // 3 – confirmation
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function DmtPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // ---- token state --------------------------------------------------------
  const [retailerId, setRetailerId] = useState("");

  // ---- step state ---------------------------------------------------------
  const [step, setStep] = useState<Step>(Step.ENTER_MOBILE);

  // ---- form values --------------------------------------------------------
  const [mobileNumber, setMobileNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");

  // ---- background data ----------------------------------------------------
  const [requestNo, setRequestNo] = useState("");

  // ---- ui state -----------------------------------------------------------
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ==================================================================
  // Extract retailer_id from JWT on mount – same pattern as DTHRecharge
  // ==================================================================
  useEffect(() => {
    console.log("[DMT] === Extracting Retailer ID from JWT ===");
    const token = localStorage.getItem("authToken");

    if (!token) {
      console.error("[DMT] No auth token found in localStorage");
      toast({
        title: "Authentication Error",
        description: "Please login again",
        variant: "destructive",
      });
      return;
    }

    console.log("[DMT] Token found, decoding...");

    try {
      const decoded: JwtPayload = jwtDecode(token);
      console.log("[DMT] Decoded JWT payload:", decoded);

      //@ts-ignore
      const userId =
        decoded.retailer_id || decoded.data?.user_id || decoded.user_id;

      console.log("[DMT] Extracted retailer_id:", userId);

      if (!userId) {
        console.error("[DMT] retailer_id not found in token payload");
        toast({
          title: "Error",
          description: "Unable to identify user. Please login again.",
          variant: "destructive",
        });
        return;
      }

      console.log("[DMT] Setting retailerId state:", userId);
      setRetailerId(userId);
    } catch (error) {
      console.error("[DMT] === JWT Decode Error ===", error);
      toast({
        title: "Error",
        description: "Session expired. Please login again.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // ---- step change log ----------------------------------------------------
  useEffect(() => {
    const labels: Record<Step, string> = {
      [Step.ENTER_MOBILE]: "ENTER_MOBILE",
      [Step.OTP_AND_DETAILS]: "OTP_AND_DETAILS",
      [Step.SUCCESS]: "SUCCESS",
    };
    console.log("[DMT] Step changed →", labels[step]);
  }, [step]);

  // ---- helper -------------------------------------------------------------
  const clearError = () => setError(null);

  // ==================================================================
  // STEP 1 – Check existence → create wallet if needed
  // ==================================================================
  const handleMobileSubmit = useCallback(async () => {
    console.log("[DMT] === handleMobileSubmit ===");
    console.log("[DMT] Mobile number:", mobileNumber);
    console.log("[DMT] Retailer ID (from token):", retailerId);

    if (!retailerId) {
      console.error("[DMT] retailer_id is empty – token not decoded yet");
      toast({
        title: "Error",
        description: "User ID not found. Please login again.",
        variant: "destructive",
      });
      return;
    }

    clearError();
    setLoading(true);

    try {
      // ── 1a. Check wallet existence ─────────────────────────────────
      console.log("[DMT] Calling CHECK EXIST endpoint...");
      const checkUrl = `${API_BASE_URL}/dmt/create/wallet`;
      const checkPayload = { mobile_no: mobileNumber };
      console.log("[DMT] POST", checkUrl, "| payload:", checkPayload);
      console.log("[DMT] Auth headers:", getAuthHeaders());

      const checkResponse = await axios.post<CheckExistsResponse>(
        checkUrl,
        checkPayload,
        getAuthHeaders()
      );

      console.log("[DMT] Check exists response status:", checkResponse.status);
      console.log("[DMT] Check exists response data:", checkResponse.data);

      const checkRes = checkResponse.data?.data?.response;
      console.log("[DMT] Extracted check response:", checkRes);

      if (checkRes?.error === 0) {
        // Wallet already exists
        console.warn(
          "[DMT] Wallet ALREADY EXISTS | Name:",
          `${checkRes.FirstName} ${checkRes.LastName}`,
          "| Limit:",
          checkRes.Limit
        );
        setError(
          `Wallet already exists for this number. (${checkRes.FirstName} ${checkRes.LastName})`
        );
        setLoading(false);
        return;
      }

      // ── 1b. Wallet doesn't exist – create it (triggers OTP) ───────
      console.log("[DMT] Wallet does NOT exist. Calling CREATE WALLET endpoint...");
      const createUrl = `${API_BASE_URL}/dmt/create/wallet`;
      const createPayload = { mobile_no: mobileNumber };
      console.log("[DMT] POST", createUrl, "| payload:", createPayload);

      const createResponse = await axios.post<CreateWalletResponse>(
        createUrl,
        createPayload,
        getAuthHeaders()
      );

      console.log("[DMT] Create wallet response status:", createResponse.status);
      console.log("[DMT] Create wallet response data:", createResponse.data);

      const createRes = createResponse.data?.data?.response;
      console.log("[DMT] Extracted create response:", createRes);

      if (createRes?.error !== 0) {
        console.error("[DMT] Create wallet FAILED | description:", createRes?.description);
        setError(createRes?.description || createRes?.msg || "Failed to send OTP");
        setLoading(false);
        return;
      }

      // Store background data
      console.log("[DMT] [BACKGROUND] Storing RequestNo:", createRes.RequestNo);
      console.log("[DMT] [BACKGROUND] MobileNo carried forward:", createRes.MobileNo);
      setRequestNo(createRes.RequestNo);

      console.log("[DMT] Transitioning to OTP_AND_DETAILS step");
      setStep(Step.OTP_AND_DETAILS);
    } catch (error: any) {
      console.error("[DMT] === handleMobileSubmit ERROR ===");
      console.error("[DMT] Error object:", error);
      console.error("[DMT] Error response:", error.response);
      console.error("[DMT] Error response data:", error.response?.data);
      console.error("[DMT] Error response status:", error.response?.status);
      console.error("[DMT] Error message:", error.message);

      const msg =
        error.response?.data?.message ||
        error.message ||
        "Something went wrong";
      setError(msg);
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      console.log("[DMT] === handleMobileSubmit ENDED ===");
    }
  }, [mobileNumber, retailerId, toast]);

  // ==================================================================
  // STEP 2 – Verify wallet creation
  // ==================================================================
  const handleVerifySubmit = useCallback(async () => {
    console.log("[DMT] === handleVerifySubmit ===");

    // Log every field
    console.log("[DMT] Form values at submission:");
    console.log("[DMT]   otp           :", otp);
    console.log("[DMT]   firstName     :", firstName);
    console.log("[DMT]   lastName      :", lastName);
    console.log("[DMT]   addressLine1  :", addressLine1);
    console.log("[DMT]   addressLine2  :", addressLine2 || "(empty – optional)");

    console.log("[DMT] Background values being injected:");
    console.log("[DMT]   retailer_id   :", retailerId, "(from JWT token)");
    console.log("[DMT]   mobile_no     :", mobileNumber, "(from Step 1)");
    console.log("[DMT]   request_no    :", requestNo, "(from CreateWallet response)");

    clearError();
    setLoading(true);

    try {
      const verifyUrl = `${API_BASE_URL}/dmt/verify/create/wallet`;
      const verifyPayload = {
        retailer_id: retailerId,       // from JWT
        mobile_no: mobileNumber,       // background – from step 1
        request_no: requestNo,         // background – from create response
        otp: Number(otp),
        firstName,
        lastName,
        addressLine1,
        addressLine2,                  // optional
        // city, state, pinCode → backend fills these
      };

      console.log("[DMT] POST", verifyUrl);
      console.log("[DMT] Payload:", verifyPayload);
      console.log("[DMT] Auth headers:", getAuthHeaders());

      const verifyResponse = await axios.post<VerifyWalletResponse>(
        verifyUrl,
        verifyPayload,
        getAuthHeaders()
      );

      console.log("[DMT] Verify response status:", verifyResponse.status);
      console.log("[DMT] Verify response data:", verifyResponse.data);

      const verifyRes = verifyResponse.data?.data?.response;
      console.log("[DMT] Extracted verify response:", verifyRes);

      if (verifyRes?.error !== 0) {
        console.error("[DMT] Verify wallet FAILED | description:", verifyRes?.description);
        setError(verifyRes?.description || verifyRes?.msg || "Verification failed");
        setLoading(false);
        return;
      }

      console.log("[DMT] Wallet verification SUCCESS. Transitioning to SUCCESS step.");
      toast({
        title: "Success",
        description: "DMT wallet created successfully!",
      });
      setStep(Step.SUCCESS);
    } catch (error: any) {
      console.error("[DMT] === handleVerifySubmit ERROR ===");
      console.error("[DMT] Error object:", error);
      console.error("[DMT] Error response:", error.response);
      console.error("[DMT] Error response data:", error.response?.data);
      console.error("[DMT] Error response status:", error.response?.status);
      console.error("[DMT] Error message:", error.message);

      const msg =
        error.response?.data?.message ||
        error.message ||
        "Something went wrong";
      setError(msg);
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      console.log("[DMT] === handleVerifySubmit ENDED ===");
    }
  }, [mobileNumber, requestNo, retailerId, otp, firstName, lastName, addressLine1, addressLine2, toast]);

  // ==================================================================
  // Navigation handlers
  // ==================================================================
  const handleBackToServices = useCallback(() => {
    console.log("[DMT] Navigating → /services");
    navigate("/services");
  }, [navigate]);

  const handleGoToBeneficiary = useCallback(() => {
    console.log("[DMT] Navigating → /dmt/beneficiary");
    navigate("/dmt/beneficiary");
  }, [navigate]);

  const handleBackToStep1 = useCallback(() => {
    console.log("[DMT] Going back to ENTER_MOBILE step");
    clearError();
    setStep(Step.ENTER_MOBILE);
  }, []);

  // ==================================================================
  // Input change handlers
  // ==================================================================
  const handleMobileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
    console.log("[DMT] Mobile input changed →", val);
    clearError();
    setMobileNumber(val);
  }, []);

  const handleOtpChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    console.log("[DMT] OTP input changed →", val);
    clearError();
    setOtp(val);
  }, []);

  const handleFirstNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("[DMT] FirstName input changed →", e.target.value);
    clearError();
    setFirstName(e.target.value);
  }, []);

  const handleLastNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("[DMT] LastName input changed →", e.target.value);
    clearError();
    setLastName(e.target.value);
  }, []);

  const handleAddressLine1Change = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("[DMT] AddressLine1 input changed →", e.target.value);
    clearError();
    setAddressLine1(e.target.value);
  }, []);

  const handleAddressLine2Change = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("[DMT] AddressLine2 input changed →", e.target.value);
    clearError();
    setAddressLine2(e.target.value);
  }, []);

  // ==================================================================
  // Render helpers
  // ==================================================================
  const renderStepIndicator = () => {
    const steps = ["Mobile No.", "Verify", "Done"];
    const currentIndex =
      step === Step.ENTER_MOBILE ? 0 : step === Step.OTP_AND_DETAILS ? 1 : 2;

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
              {i < currentIndex ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                i + 1
              )}
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

  // ── STEP 1 UI ──────────────────────────────────────────────────────
  const renderEnterMobile = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 mb-3">
          <Smartphone className="w-7 h-7 text-slate-600" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          Enter Your Mobile Number
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          We'll check if a wallet exists or create a new one for you.
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
        disabled={loading || mobileNumber.length !== 10 || !retailerId}
        className="w-full paybazaar-gradient text-white font-medium py-3 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Checking…
          </span>
        ) : !retailerId ? (
          "Loading…"
        ) : (
          "Continue"
        )}
      </Button>
    </div>
  );

  // ── STEP 2 UI ──────────────────────────────────────────────────────
  const renderOtpAndDetails = () => (
    <div className="space-y-5">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 mb-3">
          <Mail className="w-7 h-7 text-slate-600" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          Verify & Complete Profile
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          An OTP was sent to{" "}
          <span className="font-semibold text-foreground">{mobileNumber}</span>.
          Fill in the details below.
        </p>
      </div>

      {/* Mobile – read-only */}
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

      {/* OTP */}
      <div className="space-y-1">
        <Label htmlFor="otp" className="text-sm font-medium text-foreground">
          OTP <span className="text-red-500">*</span>
        </Label>
        <Input
          id="otp"
          type="tel"
          placeholder="Enter 4 / 6-digit OTP"
          value={otp}
          onChange={handleOtpChange}
          className="paybazaar-input"
          required
        />
      </div>

      {/* Name row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="firstName" className="text-sm font-medium text-foreground">
            First Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="firstName"
            placeholder="e.g. Rajesh"
            value={firstName}
            onChange={handleFirstNameChange}
            className="paybazaar-input"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="lastName" className="text-sm font-medium text-foreground">
            Last Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="lastName"
            placeholder="e.g. Kumar"
            value={lastName}
            onChange={handleLastNameChange}
            className="paybazaar-input"
            required
          />
        </div>
      </div>

      {/* Address */}
      <div className="space-y-1">
        <Label htmlFor="addressLine1" className="text-sm font-medium text-foreground">
          Address Line 1 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="addressLine1"
          placeholder="e.g. 123 Main Street"
          value={addressLine1}
          onChange={handleAddressLine1Change}
          className="paybazaar-input"
          required
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="addressLine2" className="text-sm font-medium text-foreground">
          Address Line 2{" "}
          <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Input
          id="addressLine2"
          placeholder="e.g. Apt 4B"
          value={addressLine2}
          onChange={handleAddressLine2Change}
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
          onClick={handleBackToStep1}
          className="flex-1 border-slate-300 text-slate-600 hover:bg-slate-50"
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={handleVerifySubmit}
          disabled={
            loading ||
            otp.length < 4 ||
            !firstName.trim() ||
            !lastName.trim() ||
            !addressLine1.trim()
          }
          className="flex-1 paybazaar-gradient text-white font-medium py-3 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Verifying…
            </span>
          ) : (
            "Create Wallet"
          )}
        </Button>
      </div>
    </div>
  );

  // ── STEP 3 – Success ──────────────────────────────────────────────
  const renderSuccess = () => (
    <div className="text-center space-y-5 py-4">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100">
        <CheckCircle className="w-10 h-10 text-green-600" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-foreground">Wallet Created!</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Your DMT wallet for{" "}
          <span className="font-semibold text-foreground">{mobileNumber}</span>{" "}
          has been successfully created.
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
  // Main layout
  // ==================================================================
  return (
    <div className="min-h-screen bg-background flex w-full">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main className="flex-1 p-6 space-y-6 overflow-auto">
          {/* Page header */}
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

          {/* Step indicator + card */}
          <div className="max-w-2xl mx-auto w-full">
            <div className="paybazaar-card p-8">
              {renderStepIndicator()}

              {step === Step.ENTER_MOBILE && renderEnterMobile()}
              {step === Step.OTP_AND_DETAILS && renderOtpAndDetails()}
              {step === Step.SUCCESS && renderSuccess()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}