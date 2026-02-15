import { useEffect, useState } from "react";
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
  Zap,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Search,
  X,
  Loader2,
  WifiOff,
  AlertTriangle,
} from "lucide-react";
import axios from "axios";
import { jwtDecode, JwtPayload } from "jwt-decode";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";

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

interface Plan {
  rs: number;
  desc: string;
  validity?: string;
  category?: string;
  planName?: string;
  amount?: number;
  planDescription?: string;
  planBenefitItemList?: any[];
  [key: string]: any;
}

interface PlanData {
  circle_id: number;
  _id: string;
  plan: Plan[];
}

interface RechargeHistory {
  retailer_id: string;
  mobile_recharge_transaction_id: number;
  mobile_number: string;
  operator_code: number;
  operator_name: string;
  amount: number;
  circle_code: number;
  circle_name: string;
  recharge_type: string;
  partner_request_id: string;
  created_at: string;
  commision: number;
  status: string;
}

// Backend ResponseModel structure
interface ResponseModel<T = any> {
  status: string;
  message: string;
  data?: T;
}

const MobileRecharge = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [retailerId, setRetailerId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingOperators, setIsLoadingOperators] = useState(true);
  const [isLoadingCircles, setIsLoadingCircles] = useState(true);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [filteredOperators, setFilteredOperators] = useState<Operator[]>([]);
  const [operatorSearchQuery, setOperatorSearchQuery] = useState("");
  const [circles, setCircles] = useState<Circle[]>([]);
  const [filteredCircles, setFilteredCircles] = useState<Circle[]>([]);
  const [circleSearchQuery, setCircleSearchQuery] = useState("");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [showPlansDialog, setShowPlansDialog] = useState(false);
  const [selectedPlanCategory, setSelectedPlanCategory] = useState<string>("all");
  const [rechargeHistory, setRechargeHistory] = useState<RechargeHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Recharge form state (removed rechargeType since it's always prepaid)
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
        description: "Please log in to access mobile recharge services",
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

  // Fetch operators (filtered for prepaid only)
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
        
        // Filter out postpaid operators (only keep prepaid)
        const prepaidOperators = operatorsData.filter((operator: Operator) => {
          const operatorName = operator.operator_name.toLowerCase();
          return !operatorName.includes('postpaid');
        });

        if (prepaidOperators.length === 0) {
          toast({
            title: "⚠️ No Operators Available",
            description: "No prepaid operators are currently available. Please try again later.",
            variant: "destructive",
          });
        }

        setOperators(prepaidOperators);
        setFilteredOperators(prepaidOperators);
      } catch (error: any) {
        console.error("Error fetching operators:", error);
        setOperators([]);
        setFilteredOperators([]);
        
        let errorMessage = "Unable to load operators. Please try again.";
        
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

  // Fetch recharge history
  const fetchRechargeHistory = async () => {
    if (!retailerId) return;

    setIsLoadingHistory(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/mobile_recharge/get/${retailerId}`,
        getAuthHeaders()
      );
      
      const historyData = response.data?.data?.recharges || [];
      
      if (!Array.isArray(historyData)) {
        throw new Error("Invalid response format");
      }
      
      setRechargeHistory(historyData);
      
      // Show success message only if there's history
      if (historyData.length > 0) {
        toast({
          title: "✓ History Loaded",
          description: `Found ${historyData.length} recent recharge${historyData.length > 1 ? 's' : ''}`,
        });
      }
    } catch (error: any) {
      console.error("Error fetching recharge history:", error);
      setRechargeHistory([]);
      
      // Only show toast if it's not a "no data" error
      if (error.response?.status !== 404) {
        let errorMessage = "Unable to load your recharge history.";
        
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

  // Fetch plans
  const fetchPlans = async () => {
    if (!rechargeForm.operatorCode || !rechargeForm.circleCode) {
      toast({
        title: "⚠️ Missing Information",
        description: "Please select both operator and circle before browsing plans",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingPlans(true);
    try {
      const requestBody = {
        operator_code: parseInt(rechargeForm.operatorCode),
        circle: parseInt(rechargeForm.circleCode),
      };

      const response = await axios.post(
        `${API_BASE_URL}/mobile_recharge/get/plans`,
        requestBody,
        getAuthHeaders()
      );

      const apiData = response.data?.data;
      
      if (apiData?.planData && Array.isArray(apiData.planData) && apiData.planData.length > 0) {
        const planData = apiData.planData[0];
        const planObject = planData.plan;
        
        const allPlans: Plan[] = [];
        
        Object.keys(planObject).forEach((category) => {
          const categoryPlans = planObject[category];
          if (Array.isArray(categoryPlans)) {
            categoryPlans.forEach((plan: any) => {
              allPlans.push({
                rs: plan.amount,
                desc: plan.planDescription || plan.planName || '',
                validity: plan.validity || 'NA',
                category: category,
                planName: plan.planName,
                ...plan
              });
            });
          }
        });
        
        if (allPlans.length > 0) {
          setPlans(allPlans);
          setShowPlansDialog(true);
          toast({
            title: "✓ Plans Loaded Successfully",
            description: `Found ${allPlans.length} available plans for ${rechargeForm.operatorName}`,
          });
        } else {
          toast({
            title: "⚠️ No Plans Available",
            description: `No recharge plans are currently available for ${rechargeForm.operatorName} in ${rechargeForm.circleName}`,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "⚠️ No Plans Found",
          description: response.data?.message || `No plans available for the selected operator and circle`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error fetching plans:", error);
      
      let errorMessage = "Unable to load recharge plans. Please try again.";
      
      if (!navigator.onLine) {
        errorMessage = "No internet connection. Please check your network and try again.";
      } else if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
        errorMessage = "Request timed out. The service may be slow. Please try again.";
      } else if (error.response?.status === 401) {
        errorMessage = "Your session has expired. Please log in again.";
      } else if (error.response?.status === 404) {
        errorMessage = `No plans available for ${rechargeForm.operatorName} in ${rechargeForm.circleName}`;
      } else if (error.response?.status === 500) {
        errorMessage = "Server error. Our team has been notified. Please try again later.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast({
        title: "❌ Failed to Load Plans",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoadingPlans(false);
    }
  };

  // Get unique plan categories
  const getPlanCategories = () => {
    const categories = new Set<string>();
    plans.forEach((plan) => {
      if (plan.category) {
        categories.add(plan.category);
      }
    });
    return Array.from(categories);
  };

  // Get plan count by category
  const getPlanCountByCategory = (category: string): number => {
    return plans.filter((plan) => plan.category === category).length;
  };

  // Filter plans by category
  const getFilteredPlans = () => {
    if (selectedPlanCategory === "all") {
      return plans;
    }
    return plans.filter((plan) => plan.category === selectedPlanCategory);
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

  // Handle plan selection
  const handlePlanSelect = (plan: Plan) => {
    setRechargeForm({
      ...rechargeForm,
      amount: plan.rs.toString(),
    });
    setShowPlansDialog(false);
    
    toast({
      title: "✓ Plan Selected",
      description: `₹${plan.rs} plan selected${plan.validity && plan.validity !== 'NA' ? ` • ${plan.validity} validity` : ''}`,
    });
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

    // Comprehensive validation with user-friendly messages
    if (!rechargeForm.mobileNumber) {
      toast({
        title: "⚠️ Mobile Number Required",
        description: "Please enter the mobile number you want to recharge",
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
        description: "Please select the mobile operator for this recharge",
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

    if (!rechargeForm.amount) {
      toast({
        title: "⚠️ Amount Required",
        description: "Please enter the recharge amount",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(rechargeForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "⚠️ Invalid Amount",
        description: "Please enter a valid recharge amount greater than ₹0",
        variant: "destructive",
      });
      return;
    }

    if (amount < 10) {
      toast({
        title: "⚠️ Amount Too Low",
        description: "Minimum recharge amount is ₹10. Please enter at least ₹10.",
        variant: "destructive",
      });
      return;
    }

    if (amount > 10000) {
      toast({
        title: "⚠️ Amount Too High",
        description: "Maximum recharge amount is ₹10,000 per transaction",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/mobile_recharge/create`,
        {
          retailer_id: retailerId,
          mobile_number: parseInt(rechargeForm.mobileNumber),
          operator_code: parseInt(rechargeForm.operatorCode),
          operator_name: rechargeForm.operatorName,
          amount: amount,
          circle_code: parseInt(rechargeForm.circleCode),
          circle_name: rechargeForm.circleName,
          recharge_type: "1",
          partner_request_id: `REQ_${Date.now()}`,
          commision: 0,
          status: "pending",
        },
        getAuthHeaders()
      );

      if (response.status === 200 || response.status === 201) {
        const responseMessage = response.data?.message || "Mobile recharge initiated successfully";
        
        toast({
          title: "🎉 Recharge Successful!",
          description: `₹${amount} recharged successfully to ${rechargeForm.mobileNumber} (${rechargeForm.operatorName})`,
        });

        // Reset form
        setRechargeForm({
          mobileNumber: "",
          operatorCode: "",
          operatorName: "",
          circleCode: "",
          circleName: "",
          amount: "",
        });

        // Refresh history
        fetchRechargeHistory();
      }
    } catch (error: any) {
      console.error("Recharge error:", error);

      let errorTitle = "❌ Recharge Failed";
      let errorMessage = "Unable to process your recharge. Please try again.";

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 400) {
        errorTitle = "⚠️ Invalid Request";
        errorMessage = "The recharge information provided is invalid. Please check and try again.";
      } else if (error.response?.status === 401) {
        errorTitle = "🔒 Session Expired";
        errorMessage = "Your session has expired. Please log in again to continue.";
      } else if (error.response?.status === 402) {
        errorTitle = "💰 Insufficient Balance";
        errorMessage = "You don't have enough balance to complete this recharge. Please add funds to your wallet.";
      } else if (error.response?.status === 403) {
        errorTitle = "🚫 Access Denied";
        errorMessage = "You don't have permission to perform this recharge.";
      } else if (error.response?.status === 404) {
        errorTitle = "⚠️ Service Not Found";
        errorMessage = "The recharge service is temporarily unavailable. Please try again later.";
      } else if (error.response?.status === 500) {
        errorTitle = "⚠️ Server Error";
        errorMessage = "Our server encountered an error. Our team has been notified. Please try again later.";
      } else if (error.response?.status === 503) {
        errorTitle = "⚠️ Service Unavailable";
        errorMessage = "The recharge service is temporarily down for maintenance. Please try again in a few minutes.";
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
              onClick={() => navigate("/recharge")}
              className="gap-2 hover:bg-muted/50"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Recharge
            </Button>

            {/* Mobile Recharge Card */}
            <Card className="shadow-lg border-border/50">
              <CardHeader className="paybazaar-gradient text-white rounded-t-xl space-y-1 pb-6">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Smartphone className="w-5 h-5" />
                  Mobile Recharge - Prepaid
                </CardTitle>
                <p className="text-sm text-white/90">
                  Instant recharge for all major prepaid mobile operators
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
                      Mobile Number <span className="text-red-500">*</span>
                    </Label>
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
                        }
                      }}
                      maxLength={10}
                      inputMode="numeric"
                      required
                      disabled={isLoading}
                      className="h-12 text-base"
                    />
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
                        Operator <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={rechargeForm.operatorCode}
                        onValueChange={handleOperatorChange}
                        disabled={isLoading || isLoadingOperators}
                        required
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder={isLoadingOperators ? "Loading operators..." : "Select mobile operator"} />
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
                                No operators available
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

                  {/* Amount and Browse Plans */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="amount"
                      className="text-sm font-medium text-foreground"
                    >
                      Recharge Amount <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                          ₹
                        </span>
                        <Input
                          id="amount"
                          type="number"
                          placeholder="Enter recharge amount"
                          value={rechargeForm.amount}
                          onChange={(e) =>
                            setRechargeForm({
                              ...rechargeForm,
                              amount: e.target.value,
                            })
                          }
                          min="10"
                          max="10000"
                          step="1"
                          required
                          disabled={isLoading}
                          className="h-12 text-base pl-8"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={fetchPlans}
                        disabled={
                          isLoadingPlans ||
                          !rechargeForm.operatorCode ||
                          !rechargeForm.circleCode
                        }
                        className="h-12 px-6"
                        title={!rechargeForm.operatorCode || !rechargeForm.circleCode ? "Select operator and circle first" : "Browse available plans"}
                      >
                        {isLoadingPlans ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Zap className="w-4 h-4 mr-2" />
                            Browse Plans
                          </>
                        )}
                      </Button>
                    </div>
                    {parseFloat(rechargeForm.amount) > 0 &&
                      parseFloat(rechargeForm.amount) < 10 && (
                        <p className="text-xs text-amber-600 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Minimum recharge amount is ₹10
                        </p>
                      )}
                    {parseFloat(rechargeForm.amount) > 10000 && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Maximum recharge amount is ₹10,000 per transaction
                      </p>
                    )}
                    {parseFloat(rechargeForm.amount) >= 10 &&
                      parseFloat(rechargeForm.amount) <= 10000 && (
                        <p className="text-xs text-muted-foreground">
                          You're recharging ₹{parseFloat(rechargeForm.amount).toLocaleString('en-IN')}
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
                      <li>Ensure you have sufficient balance in your wallet</li>
                      <li>Recharge will be processed instantly upon confirmation</li>
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
                      parseFloat(rechargeForm.amount) < 10 ||
                      parseFloat(rechargeForm.amount) > 10000
                    }
                    className="w-full paybazaar-gradient text-white hover:opacity-90 transition-opacity h-12 text-base font-medium disabled:opacity-50"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing Your Recharge...
                      </span>
                    ) : (
                      <>
                        <Smartphone className="w-4 h-4 mr-2" />
                        Recharge ₹{rechargeForm.amount || '0'} Now
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
                    Recent Recharge History
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={fetchRechargeHistory}
                    disabled={isLoadingHistory}
                    title="Refresh recharge history"
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
                  View your last 10 recharge transactions
                </p>
              </CardHeader>

              <CardContent className="pt-6">
                {isLoadingHistory ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                    <p className="text-sm text-muted-foreground">Loading your recharge history...</p>
                  </div>
                ) : rechargeHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                      <Smartphone className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-lg font-semibold text-foreground mb-2">
                      No Recharge History
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Your completed recharges will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Array.isArray(rechargeHistory) && rechargeHistory.slice(0, 10).map((history) => (
                      <div
                        key={history.mobile_recharge_transaction_id}
                        className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-base font-mono">
                                {history.mobile_number}
                              </p>
                              {getStatusBadge(history.status)}
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
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg text-primary">
                              ₹{history.amount.toLocaleString('en-IN')}
                            </p>
                            {history.commision > 0 && (
                              <p className="text-xs text-green-600 flex items-center gap-1 justify-end">
                                <CheckCircle2 className="w-3 h-3" />
                                +₹{history.commision.toFixed(2)} earned
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

      {/* Plans Dialog */}
      <Dialog open={showPlansDialog} onOpenChange={setShowPlansDialog}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col p-0 bg-background">
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-background z-10">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Zap className="w-5 h-5 text-primary" />
              Available Recharge Plans
            </DialogTitle>
            <DialogDescription className="text-sm">
              {rechargeForm.operatorName && rechargeForm.circleName 
                ? `Plans for ${rechargeForm.operatorName} in ${rechargeForm.circleName} • Select a plan to auto-fill amount`
                : "Select a plan to auto-fill the recharge amount"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col bg-background">
            <Tabs
              value={selectedPlanCategory}
              onValueChange={setSelectedPlanCategory}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {/* Scrollable Tabs List with proper background */}
              <div className="px-6 pt-4 pb-2 border-b bg-background z-10 relative">
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                  <TabsList className="inline-flex h-auto p-1 bg-muted rounded-lg min-w-full w-max">
                    <TabsTrigger 
                      value="all" 
                      className="px-4 py-2.5 text-sm font-medium whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                    >
                      <span>All Plans</span>
                      <Badge variant="outline" className="ml-2 text-xs bg-background">
                        {plans.length}
                      </Badge>
                    </TabsTrigger>
                    {getPlanCategories().map((category) => (
                      <TabsTrigger 
                        key={category} 
                        value={category}
                        className="px-4 py-2.5 text-sm font-medium whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                      >
                        <span>{category}</span>
                        <Badge variant="outline" className="ml-2 text-xs bg-background">
                          {getPlanCountByCategory(category)}
                        </Badge>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
              </div>

              {/* Scrollable Content Area with proper background */}
              <div className="flex-1 overflow-y-auto px-6 py-4 bg-background">
                <TabsContent value={selectedPlanCategory} className="m-0 mt-0">
                  {getFilteredPlans().length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="font-semibold mb-1">No Plans Available</p>
                      <p className="text-sm">No plans found in this category</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                      {getFilteredPlans().map((plan, index) => (
                        <div
                          key={index}
                          className="border border-border rounded-lg p-5 hover:border-primary hover:shadow-lg cursor-pointer transition-all duration-200 bg-card"
                          onClick={() => handlePlanSelect(plan)}
                        >
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <p className="font-bold text-2xl text-primary">
                                  ₹{plan.rs}
                                </p>
                                {plan.category && (
                                  <Badge className="text-xs shrink-0 bg-primary/10 text-primary hover:bg-primary/20">
                                    {plan.category}
                                  </Badge>
                                )}
                              </div>
                              {plan.planName && (
                                <p className="text-sm font-semibold text-foreground mb-1">
                                  {plan.planName}
                                </p>
                              )}
                              {plan.validity && plan.validity !== 'NA' && plan.validity !== 'NA days' && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Validity: {plan.validity}
                                </p>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed mb-4">
                            {plan.desc}
                          </p>
                          <div className="pt-3 border-t border-border/50">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full text-primary border-primary/50 hover:bg-primary hover:text-primary-foreground transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlanSelect(plan);
                              }}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                              Select This Plan
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MobileRecharge;