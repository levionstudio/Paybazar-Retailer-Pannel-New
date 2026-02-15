import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Smartphone,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  FileText,
  Search,
  X,
  Loader2,
  WifiOff,
  AlertTriangle,
  Receipt,
} from "lucide-react";
import axios from "axios";
import { jwtDecode, JwtPayload } from "jwt-decode";
import { Badge } from "@/components/ui/badge";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
};

// Types
interface Operator {
  operator_code: number;
  operator_name: string;
}

interface Circle {
  circle_code: number;
  circle_name: string;
}

// API Response - billAmount comes as strings
interface BillDetailsAPI {
  billAmount: string;
  billnetamount: string;
  billdate: string;
  dueDate: string;
  acceptPayment: boolean;
  acceptPartPay: boolean;
  cellNumber: string;
  userName: string;
}

// Internal state - parsed as numbers
interface BillDetails {
  billAmount: number;
  billnetamount: number;
  billdate: string;
  dueDate: string;
  acceptPayment: boolean;
  acceptPartPay: boolean;
  cellNumber: string;
  userName: string;
}

interface RechargeHistory {
  retailer_id: string;
  postpaid_recharge_transaction_id: number;
  mobile_number: string;
  operator_code: number;
  operator_name: string;
  amount: number;
  circle_code: number;
  circle_name: string;
  recharge_type: string;
  partner_request_id: string;
  created_at: string;
  commission: number;
  recharge_status: string;
  order_id: string;
  operator_transaction_id: string;
  retailer_name: string;
  retailer_business_name: string;
  before_balance: number;
  after_balance: number;
}

const MobileRechargePostpaid = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [retailerId, setRetailerId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingOperators, setIsLoadingOperators] = useState(true);
  const [isLoadingCircles, setIsLoadingCircles] = useState(true);
  const [isFetchingBill, setIsFetchingBill] = useState(false);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [filteredOperators, setFilteredOperators] = useState<Operator[]>([]);
  const [operatorSearchQuery, setOperatorSearchQuery] = useState("");
  const [circles, setCircles] = useState<Circle[]>([]);
  const [filteredCircles, setFilteredCircles] = useState<Circle[]>([]);
  const [circleSearchQuery, setCircleSearchQuery] = useState("");
  const [billDetails, setBillDetails] = useState<BillDetails | null>(null);
  const [rechargeHistory, setRechargeHistory] = useState<RechargeHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Recharge form state
  const [rechargeForm, setRechargeForm] = useState({
    mobileNumber: "",
    operatorCode: "",
    operatorName: "",
    circleCode: "",
    circleName: "",
    amount: "",
  });

  // Extract retailer ID from JWT token
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast({
        title: "⚠️ Authentication Required",
        description: "Please log in to access postpaid bill payment services",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    try {
      const decoded: JwtPayload = jwtDecode(token);
      //@ts-ignore
      const userId =
        decoded.retailer_id || decoded.data?.user_id || decoded.user_id;

      if (!userId) {
        toast({
          title: "⚠️ Session Error",
          description: "Unable to verify your identity. Please log in again.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      setRetailerId(userId);
    } catch (error) {
      console.error("Error decoding JWT:", error);
      toast({
        title: "⚠️ Session Expired",
        description: "Your session has expired. Please log in again to continue.",
        variant: "destructive",
      });
      navigate("/login");
    }
  }, [toast, navigate]);

  // Fetch operators (filtered for postpaid only)
  useEffect(() => {
    const fetchOperators = async () => {
      setIsLoadingOperators(true);

      try {
        const response = await axios.get(
          `${API_BASE_URL}/mobile_recharge/get/operators`,
          getAuthHeaders()
        );

        const operatorsData = response.data?.data?.operators || [];
        
        if (!Array.isArray(operatorsData)) {
          throw new Error("Invalid response format");
        }
        
        // Filter for postpaid operators only
        const postpaidOperators = operatorsData.filter((operator: Operator) => {
          const operatorName = operator.operator_name.toLowerCase();
          return operatorName.includes('postpaid');
        });

        if (postpaidOperators.length === 0) {
          toast({
            title: "⚠️ No Postpaid Operators",
            description: "No postpaid operators are currently available. Please try again later.",
            variant: "destructive",
          });
        }
        
        setOperators(postpaidOperators);
        setFilteredOperators(postpaidOperators);
      } catch (error: any) {
        console.error("Error fetching operators:", error);
        setOperators([]);
        setFilteredOperators([]);
        
        let errorMessage = "Unable to load postpaid operators. Please try again.";
        
        if (!navigator.onLine) {
          errorMessage = "No internet connection. Please check your network and try again.";
        } else if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
          errorMessage = "Request timed out. Please check your connection and try again.";
        } else if (error.response?.status === 401) {
          errorMessage = "Your session has expired. Please log in again.";
        } else if (error.response?.status === 500) {
          errorMessage = "Server error. Our team has been notified. Please try again later.";
        }
        
        toast({
          title: "❌ Failed to Load Operators",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLoadingOperators(false);
      }
    };

    fetchOperators();
  }, [toast]);

  // Fetch circles
  useEffect(() => {
    const fetchCircles = async () => {
      setIsLoadingCircles(true);

      try {
        const response = await axios.get(
          `${API_BASE_URL}/mobile_recharge/get/circle`,
          getAuthHeaders()
        );
        
        const circlesData = response.data?.data?.circles || [];
        
        if (!Array.isArray(circlesData)) {
          throw new Error("Invalid response format");
        }

        if (circlesData.length === 0) {
          toast({
            title: "⚠️ No Circles Available",
            description: "No telecom circles are currently available. Please try again later.",
            variant: "destructive",
          });
        }
        
        setCircles(circlesData);
        setFilteredCircles(circlesData);
      } catch (error: any) {
        console.error("Error fetching circles:", error);
        setCircles([]);
        setFilteredCircles([]);
        
        let errorMessage = "Unable to load circles. Please try again.";
        
        if (!navigator.onLine) {
          errorMessage = "No internet connection. Please check your network and try again.";
        } else if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
          errorMessage = "Request timed out. Please check your connection and try again.";
        } else if (error.response?.status === 401) {
          errorMessage = "Your session has expired. Please log in again.";
        } else if (error.response?.status === 500) {
          errorMessage = "Server error. Our team has been notified. Please try again later.";
        }
        
        toast({
          title: "❌ Failed to Load Circles",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLoadingCircles(false);
      }
    };

    fetchCircles();
  }, [toast]);

  // Filter operators based on search query
  useEffect(() => {
    if (operatorSearchQuery.trim() === "") {
      setFilteredOperators(operators);
    } else {
      const filtered = operators.filter((operator) =>
        operator.operator_name
          .toLowerCase()
          .includes(operatorSearchQuery.toLowerCase())
      );
      setFilteredOperators(filtered);
    }
  }, [operatorSearchQuery, operators]);

  // Filter circles based on search query
  useEffect(() => {
    if (circleSearchQuery.trim() === "") {
      setFilteredCircles(circles);
    } else {
      const filtered = circles.filter((circle) =>
        circle.circle_name
          .toLowerCase()
          .includes(circleSearchQuery.toLowerCase())
      );
      setFilteredCircles(filtered);
    }
  }, [circleSearchQuery, circles]);

  // Fetch postpaid recharge history from BBPS endpoint
  const fetchRechargeHistory = async () => {
    if (!retailerId) return;

    setIsLoadingHistory(true);
    
    try {
      const response = await axios.get(
        `${API_BASE_URL}/bbps/recharge/get/${retailerId}`,
        getAuthHeaders()
      );

      const historyData = response.data?.data?.history || [];
      
      if (!Array.isArray(historyData)) {
        throw new Error("Invalid response format");
      }
      
      setRechargeHistory(historyData);
      
      // Show success message only if there's history
      if (historyData.length > 0) {
        toast({
          title: "✓ History Loaded",
          description: `Found ${historyData.length} recent payment${historyData.length > 1 ? 's' : ''}`,
        });
      }
    } catch (error: any) {
      console.error("Error fetching recharge history:", error);
      setRechargeHistory([]);
      
      if (error.response?.status !== 404) {
        let errorMessage = "Unable to load your payment history.";
        
        if (!navigator.onLine) {
          errorMessage = "No internet connection. Please check your network.";
        } else if (error.response?.status === 401) {
          errorMessage = "Your session has expired. Please log in again.";
        } else if (error.response?.status === 500) {
          errorMessage = "Server error. Please try again later.";
        }
        
        toast({
          title: "⚠️ History Load Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (retailerId) {
      fetchRechargeHistory();
    }
  }, [retailerId]);

  // Fetch bill details
  const handleFetchBill = async () => {
    if (!rechargeForm.mobileNumber || !rechargeForm.operatorCode) {
      toast({
        title: "⚠️ Missing Information",
        description: "Please enter mobile number and select operator before fetching bill",
        variant: "destructive",
      });
      return;
    }

    if (!validateMobileNumber(rechargeForm.mobileNumber)) {
      toast({
        title: "⚠️ Invalid Mobile Number",
        description: "Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9",
        variant: "destructive",
      });
      return;
    }

    setIsFetchingBill(true);
    setBillDetails(null);
    setRechargeForm({ ...rechargeForm, amount: "" });

    const requestPayload = {
      mobile_no: rechargeForm.mobileNumber,
      operator_code: parseInt(rechargeForm.operatorCode),
    };

    try {
      const response = await axios.post(
        `${API_BASE_URL}/bbps/get/postpaid/balance`,
        requestPayload,
        getAuthHeaders()
      );

      const billAmountArray = response.data?.data?.response?.billAmount;

      // Get first item from array
      const billData = Array.isArray(billAmountArray) && billAmountArray.length > 0 
        ? billAmountArray[0] 
        : null;

      if (billData) {
        // Parse string amounts to numbers
        const parsedBillData: BillDetails = {
          billAmount: parseFloat(billData.billAmount),
          billnetamount: parseFloat(billData.billnetamount),
          billdate: billData.billdate,
          dueDate: billData.dueDate,
          acceptPayment: billData.acceptPayment,
          acceptPartPay: billData.acceptPartPay,
          cellNumber: billData.cellNumber,
          userName: billData.userName,
        };

        if (parsedBillData.acceptPayment) {
          setBillDetails(parsedBillData);
          setRechargeForm({
            ...rechargeForm,
            amount: parsedBillData.billAmount.toString(),
          });
          
          toast({
            title: "✓ Bill Fetched Successfully",
            description: `Bill for ${parsedBillData.userName}: ₹${parsedBillData.billAmount.toLocaleString('en-IN')} • Due: ${parsedBillData.dueDate}`,
          });
        } else {
          toast({
            title: "⚠️ Bill Not Payable",
            description: "This bill is not currently accepting payments. Please try again later or contact your operator.",
            variant: "destructive",
          });
        }
      } else {
        const apiMessage = response.data?.data?.response?.msg;
        toast({
          title: "⚠️ Bill Not Available",
          description: apiMessage || "No pending bill found for this number. Please verify the mobile number and operator.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error fetching bill:", error);
      
      let errorTitle = "❌ Failed to Fetch Bill";
      let errorMessage = "Unable to retrieve bill details. Please try again.";
      
      if (!navigator.onLine) {
        errorTitle = "📡 No Internet Connection";
        errorMessage = "Please check your internet connection and try again.";
      } else if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
        errorTitle = "⏱️ Request Timeout";
        errorMessage = "The request took too long. Please check your connection and try again.";
      } else if (error.response?.status === 400) {
        errorTitle = "⚠️ Invalid Request";
        errorMessage = "The mobile number or operator combination is invalid. Please verify and try again.";
      } else if (error.response?.status === 401) {
        errorTitle = "🔒 Session Expired";
        errorMessage = "Your session has expired. Please log in again.";
      } else if (error.response?.status === 404) {
        errorTitle = "📄 No Bill Found";
        errorMessage = "No pending bill found for this number. Please verify the mobile number and operator.";
      } else if (error.response?.status === 500) {
        errorTitle = "⚠️ Server Error";
        errorMessage = "Our server encountered an error. Our team has been notified. Please try again later.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsFetchingBill(false);
    }
  };

  // Handle operator change
  const handleOperatorChange = (value: string) => {
    const selectedOperator = operators.find(
      (op) => op.operator_code.toString() === value
    );
    if (selectedOperator) {
      setRechargeForm({
        ...rechargeForm,
        operatorCode: value,
        operatorName: selectedOperator.operator_name,
      });
      setBillDetails(null); // Reset bill details when operator changes
      
      toast({
        title: "✓ Operator Selected",
        description: `${selectedOperator.operator_name} selected`,
      });
    }
  };

  // Handle circle change
  const handleCircleChange = (value: string) => {
    const selectedCircle = circles.find(
      (circle) => circle.circle_code.toString() === value
    );
    if (selectedCircle) {
      setRechargeForm({
        ...rechargeForm,
        circleCode: value,
        circleName: selectedCircle.circle_name,
      });
      
      toast({
        title: "✓ Circle Selected",
        description: `${selectedCircle.circle_name} selected`,
      });
    }
  };

  // Validate mobile number
  const validateMobileNumber = (number: string): boolean => {
    const mobileRegex = /^[6-9]\d{9}$/;
    return mobileRegex.test(number);
  };

  // Handle recharge submission
  const handleRechargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!retailerId) {
      toast({
        title: "⚠️ Session Error",
        description: "Your session has expired. Please log in again to continue.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    // Comprehensive validation
    if (!rechargeForm.mobileNumber) {
      toast({
        title: "⚠️ Mobile Number Required",
        description: "Please enter the postpaid mobile number",
        variant: "destructive",
      });
      return;
    }

    if (!validateMobileNumber(rechargeForm.mobileNumber)) {
      toast({
        title: "⚠️ Invalid Mobile Number",
        description: "Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9",
        variant: "destructive",
      });
      return;
    }

    if (!rechargeForm.operatorCode) {
      toast({
        title: "⚠️ Operator Not Selected",
        description: "Please select the postpaid operator",
        variant: "destructive",
      });
      return;
    }

    if (!rechargeForm.circleCode) {
      toast({
        title: "⚠️ Circle Not Selected",
        description: "Please select the telecom circle for this number",
        variant: "destructive",
      });
      return;
    }

    if (!billDetails) {
      toast({
        title: "⚠️ Bill Not Fetched",
        description: "Please fetch the bill details before making payment",
        variant: "destructive",
      });
      return;
    }

    if (!rechargeForm.amount) {
      toast({
        title: "⚠️ Amount Required",
        description: "Please enter the payment amount",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(rechargeForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "⚠️ Invalid Amount",
        description: "Please enter a valid payment amount greater than ₹0",
        variant: "destructive",
      });
      return;
    }

    if (amount > billDetails.billAmount * 2) {
      toast({
        title: "⚠️ Amount Too High",
        description: `The amount seems unusually high. Bill amount is ₹${billDetails.billAmount.toLocaleString('en-IN')}. Please verify.`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const requestPayload = {
      retailer_id: retailerId,
      mobile_no: rechargeForm.mobileNumber,
      operator_code: parseInt(rechargeForm.operatorCode),
      operator_name: rechargeForm.operatorName,
      amount: amount,
      circle: parseInt(rechargeForm.circleCode),
      circle_name: rechargeForm.circleName,
      partner_request_id: `POSTPAID_${Date.now()}`,
    };

    try {
      const response = await axios.post(
        `${API_BASE_URL}/bbps/create/postpaid`,
        requestPayload,
        getAuthHeaders()
      );

      if (response.status === 200 || response.status === 201) {
        const responseMessage = response.data?.message || "Postpaid bill payment successful";
        
        toast({
          title: "🎉 Payment Successful!",
          description: `₹${amount.toLocaleString('en-IN')} paid successfully for ${rechargeForm.mobileNumber} (${rechargeForm.operatorName})`,
        });

        // Reset form and bill details
        setRechargeForm({
          mobileNumber: "",
          operatorCode: "",
          operatorName: "",
          circleCode: "",
          circleName: "",
          amount: "",
        });
        setBillDetails(null);

        // Refresh history
        fetchRechargeHistory();
      }
    } catch (error: any) {
      console.error("Payment error:", error);

      let errorTitle = "❌ Payment Failed";
      let errorMessage = "Unable to process your payment. Please try again.";

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 400) {
        errorTitle = "⚠️ Invalid Request";
        errorMessage = "The payment information provided is invalid. Please check and try again.";
      } else if (error.response?.status === 401) {
        errorTitle = "🔒 Session Expired";
        errorMessage = "Your session has expired. Please log in again to continue.";
      } else if (error.response?.status === 402) {
        errorTitle = "💰 Insufficient Balance";
        errorMessage = "You don't have enough balance to complete this payment. Please add funds to your wallet.";
      } else if (error.response?.status === 403) {
        errorTitle = "🚫 Access Denied";
        errorMessage = "You don't have permission to perform this payment.";
      } else if (error.response?.status === 404) {
        errorTitle = "⚠️ Service Not Found";
        errorMessage = "The payment service is temporarily unavailable. Please try again later.";
      } else if (error.response?.status === 500) {
        errorTitle = "⚠️ Server Error";
        errorMessage = "Our server encountered an error. Our team has been notified. Please try again later.";
      } else if (error.response?.status === 503) {
        errorTitle = "⚠️ Service Unavailable";
        errorMessage = "The payment service is temporarily down for maintenance. Please try again in a few minutes.";
      } else if (!navigator.onLine) {
        errorTitle = "📡 No Internet Connection";
        errorMessage = "Please check your internet connection and try again.";
      } else if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
        errorTitle = "⏱️ Request Timeout";
        errorMessage = "The request took too long. Please check your connection and try again.";
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "success":
        return (
          <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Success
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20">
            <RefreshCw className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20">
            <AlertCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Back Button */}
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="gap-2 hover:bg-muted/50"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to BBPS
            </Button>

            {/* Mobile Recharge Card */}
            <Card className="shadow-lg border-border/50">
              <CardHeader className="paybazaar-gradient text-white rounded-t-xl space-y-1 pb-6">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Smartphone className="w-5 h-5" />
                  Mobile Recharge - Postpaid
                </CardTitle>
                <p className="text-sm text-white/90">
                  Pay your postpaid mobile bills instantly with ease
                </p>
              </CardHeader>

              <CardContent className="pt-6 pb-8 px-6">
                <form onSubmit={handleRechargeSubmit} className="space-y-6">
                  {/* Mobile Number */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="mobileNumber"
                      className="text-sm font-medium text-foreground"
                    >
                      Postpaid Mobile Number <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="mobileNumber"
                        type="tel"
                        placeholder="Enter 10-digit mobile number"
                        value={rechargeForm.mobileNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          if (value.length <= 10) {
                            setRechargeForm({
                              ...rechargeForm,
                              mobileNumber: value,
                            });
                            setBillDetails(null); // Reset bill when number changes
                          }
                        }}
                        maxLength={10}
                        inputMode="numeric"
                        required
                        disabled={isLoading}
                        className="h-12 text-base flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleFetchBill}
                        disabled={
                          isFetchingBill ||
                          !rechargeForm.mobileNumber ||
                          !rechargeForm.operatorCode ||
                          !validateMobileNumber(rechargeForm.mobileNumber)
                        }
                        className="h-12 px-6"
                        title={!rechargeForm.operatorCode ? "Select operator first" : "Fetch bill details"}
                      >
                        {isFetchingBill ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <FileText className="w-4 h-4 mr-2" />
                            Fetch Bill
                          </>
                        )}
                      </Button>
                    </div>
                    {rechargeForm.mobileNumber.length > 0 &&
                      rechargeForm.mobileNumber.length < 10 && (
                        <p className="text-xs text-amber-600 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {10 - rechargeForm.mobileNumber.length} more digit{10 - rechargeForm.mobileNumber.length > 1 ? 's' : ''} required
                        </p>
                      )}
                    {rechargeForm.mobileNumber.length === 10 &&
                      !validateMobileNumber(rechargeForm.mobileNumber) && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Invalid mobile number (must start with 6, 7, 8, or 9)
                        </p>
                      )}
                    {rechargeForm.mobileNumber.length === 10 &&
                      validateMobileNumber(rechargeForm.mobileNumber) && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Valid mobile number
                        </p>
                      )}
                  </div>

                  {/* Operator and Circle Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Operator */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="operator"
                        className="text-sm font-medium text-foreground"
                      >
                        Postpaid Operator <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={rechargeForm.operatorCode}
                        onValueChange={handleOperatorChange}
                        disabled={isLoading || isLoadingOperators}
                        required
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder={isLoadingOperators ? "Loading operators..." : "Select postpaid operator"} />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Search Input Inside Dropdown */}
                          <div className="sticky top-0 bg-background z-10 p-2 border-b">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                type="text"
                                placeholder="Search operators..."
                                value={operatorSearchQuery}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  setOperatorSearchQuery(e.target.value);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                                className="h-9 pl-9 pr-9"
                              />
                              {operatorSearchQuery && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOperatorSearchQuery("");
                                  }}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Operators List */}
                          <div className="max-h-[300px] overflow-y-auto">
                            {isLoadingOperators ? (
                              <div className="py-8 flex flex-col items-center justify-center text-muted-foreground">
                                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                                <p className="text-sm">Loading operators...</p>
                              </div>
                            ) : Array.isArray(filteredOperators) && filteredOperators.length > 0 ? (
                              filteredOperators.map((operator) => (
                                <SelectItem
                                  key={operator.operator_code}
                                  value={operator.operator_code.toString()}
                                >
                                  {operator.operator_name}
                                </SelectItem>
                              ))
                            ) : operatorSearchQuery ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">
                                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                No operators found for "{operatorSearchQuery}"
                              </div>
                            ) : (
                              <div className="py-6 text-center text-sm text-muted-foreground">
                                <WifiOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                No postpaid operators available
                              </div>
                            )}
                          </div>

                          {/* Results Count */}
                          {operatorSearchQuery && filteredOperators.length > 0 && (
                            <div className="sticky bottom-0 bg-background border-t p-2 text-xs text-center text-muted-foreground">
                              Showing {filteredOperators.length} of {operators.length} operators
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Circle */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="circle"
                        className="text-sm font-medium text-foreground"
                      >
                        Circle <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={rechargeForm.circleCode}
                        onValueChange={handleCircleChange}
                        disabled={isLoading || isLoadingCircles}
                        required
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder={isLoadingCircles ? "Loading circles..." : "Select your circle/region"} />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Search Input Inside Dropdown */}
                          <div className="sticky top-0 bg-background z-10 p-2 border-b">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                type="text"
                                placeholder="Search circles..."
                                value={circleSearchQuery}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  setCircleSearchQuery(e.target.value);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                                className="h-9 pl-9 pr-9"
                              />
                              {circleSearchQuery && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCircleSearchQuery("");
                                  }}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Circles List */}
                          <div className="max-h-[300px] overflow-y-auto">
                            {isLoadingCircles ? (
                              <div className="py-8 flex flex-col items-center justify-center text-muted-foreground">
                                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                                <p className="text-sm">Loading circles...</p>
                              </div>
                            ) : Array.isArray(filteredCircles) && filteredCircles.length > 0 ? (
                              filteredCircles.map((circle) => (
                                <SelectItem
                                  key={circle.circle_code}
                                  value={circle.circle_code.toString()}
                                >
                                  {circle.circle_name}
                                </SelectItem>
                              ))
                            ) : circleSearchQuery ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">
                                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                No circles found for "{circleSearchQuery}"
                              </div>
                            ) : (
                              <div className="py-6 text-center text-sm text-muted-foreground">
                                <WifiOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                No circles available
                              </div>
                            )}
                          </div>

                          {/* Results Count */}
                          {circleSearchQuery && filteredCircles.length > 0 && (
                            <div className="sticky bottom-0 bg-background border-t p-2 text-xs text-center text-muted-foreground">
                              Showing {filteredCircles.length} of {circles.length} circles
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Bill Details */}
                  {billDetails && (
                    <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-5 space-y-4 border-2 border-primary/30">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded-full bg-primary/10">
                          <Receipt className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-lg">Bill Details</p>
                          <p className="text-xs text-muted-foreground">Fetched successfully</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-background/50 rounded-md p-3">
                          <p className="text-muted-foreground text-xs mb-1">Customer Name</p>
                          <p className="font-semibold text-foreground">{billDetails.userName}</p>
                        </div>
                        <div className="bg-background/50 rounded-md p-3">
                          <p className="text-muted-foreground text-xs mb-1">Mobile Number</p>
                          <p className="font-semibold text-foreground font-mono">{billDetails.cellNumber}</p>
                        </div>
                        <div className="bg-background/50 rounded-md p-3">
                          <p className="text-muted-foreground text-xs mb-1">Bill Date</p>
                          <p className="font-semibold text-foreground">{billDetails.billdate}</p>
                        </div>
                        <div className="bg-background/50 rounded-md p-3">
                          <p className="text-muted-foreground text-xs mb-1">Due Date</p>
                          <p className="font-semibold text-foreground">{billDetails.dueDate}</p>
                        </div>
                        <div className="bg-background/50 rounded-md p-3">
                          <p className="text-muted-foreground text-xs mb-1">Bill Amount</p>
                          <p className="font-bold text-xl text-primary">₹{billDetails.billAmount.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="bg-background/50 rounded-md p-3">
                          <p className="text-muted-foreground text-xs mb-1">Net Amount</p>
                          <p className="font-bold text-xl text-primary">₹{billDetails.billnetamount.toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                      {billDetails.acceptPartPay && (
                        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md p-3">
                          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                          <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                            Partial payment allowed - You can pay any amount
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Amount */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="amount"
                      className="text-sm font-medium text-foreground"
                    >
                      Payment Amount <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                        ₹
                      </span>
                      <Input
                        id="amount"
                        type="number"
                        placeholder={billDetails ? "Enter payment amount" : "Fetch bill first"}
                        value={rechargeForm.amount}
                        onChange={(e) =>
                          setRechargeForm({
                            ...rechargeForm,
                            amount: e.target.value,
                          })
                        }
                        min="1"
                        step="0.01"
                        required
                        disabled={isLoading || !billDetails}
                        className="h-12 text-base pl-8"
                      />
                    </div>
                    {billDetails && parseFloat(rechargeForm.amount) > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {parseFloat(rechargeForm.amount) === billDetails.billAmount 
                          ? `Paying full bill amount: ₹${billDetails.billAmount.toLocaleString('en-IN')}`
                          : `Paying ₹${parseFloat(rechargeForm.amount).toLocaleString('en-IN')} of ₹${billDetails.billAmount.toLocaleString('en-IN')} bill`
                        }
                      </p>
                    )}
                    {!billDetails && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Please fetch bill details before entering amount
                      </p>
                    )}
                  </div>

                  {/* Information Box */}
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Important Information
                    </p>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1.5 list-disc list-inside ml-1">
                      <li>Always fetch bill details before making payment</li>
                      <li>Ensure you have sufficient balance in your wallet</li>
                      <li>Payment will be processed instantly upon confirmation</li>
                      <li>Double-check the mobile number before submitting</li>
                      <li>Completed transactions cannot be reversed or cancelled</li>
                      <li>Contact support immediately if you face any issues</li>
                    </ul>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    size="lg"
                    disabled={
                      isLoading ||
                      !validateMobileNumber(rechargeForm.mobileNumber) ||
                      !rechargeForm.operatorCode ||
                      !rechargeForm.circleCode ||
                      !billDetails ||
                      parseFloat(rechargeForm.amount) <= 0
                    }
                    className="w-full paybazaar-gradient text-white hover:opacity-90 transition-opacity h-12 text-base font-medium disabled:opacity-50"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing Your Payment...
                      </span>
                    ) : (
                      <>
                        <Smartphone className="w-4 h-4 mr-2" />
                        Pay Bill ₹{rechargeForm.amount || '0'} Now
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Recharge History Card */}
            <Card className="shadow-lg border-border/50">
              <CardHeader className="paybazaar-gradient text-white rounded-t-xl space-y-1 pb-6">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xl">
                    <RefreshCw className="w-5 h-5" />
                    Recent Postpaid Payment History
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={fetchRechargeHistory}
                    disabled={isLoadingHistory}
                    title="Refresh payment history"
                  >
                    {isLoadingHistory ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Refresh
                      </>
                    )}
                  </Button>
                </CardTitle>
                <p className="text-sm text-white/90">
                  View your last 10 postpaid bill payments
                </p>
              </CardHeader>

              <CardContent className="pt-6">
                {isLoadingHistory ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                    <p className="text-sm text-muted-foreground">Loading your payment history...</p>
                  </div>
                ) : rechargeHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                      <Smartphone className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-lg font-semibold text-foreground mb-2">
                      No Payment History
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Your postpaid bill payments will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Array.isArray(rechargeHistory) && rechargeHistory.slice(0, 10).map((history) => (
                      <div
                        key={history.postpaid_recharge_transaction_id}
                        className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-base font-mono">
                                {history.mobile_number}
                              </p>
                              {getStatusBadge(history.recharge_status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {history.operator_name} • {history.circle_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(history.created_at).toLocaleString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                            {history.order_id && (
                              <p className="text-xs text-muted-foreground font-mono">
                                Order: {history.order_id}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg text-primary">
                              ₹{history.amount.toLocaleString('en-IN')}
                            </p>
                            {history.commission > 0 && (
                              <p className="text-xs text-green-600 flex items-center gap-1 justify-end">
                                <CheckCircle2 className="w-3 h-3" />
                                +₹{history.commission.toFixed(2)} earned
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileRechargePostpaid;