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
        title: "Authentication Error",
        description: "Please login again",
        variant: "destructive",
      });
      return;
    }

    try {
      const decoded: JwtPayload = jwtDecode(token);
      //@ts-ignore
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
    } catch (error) {
      console.error("Error decoding JWT:", error);
      toast({
        title: "Error",
        description: "Session expired. Please login again.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Fetch operators (filtered for prepaid only)
  useEffect(() => {
    const fetchOperators = async () => {
      setIsLoadingOperators(true);
      try {
        const response = await axios.get(
          `${API_BASE_URL}/mobile_recharge/get/operators`,
          getAuthHeaders()
        );
        
        // Backend returns: { status, message, data: { operators: [...] } }
        const operatorsData = response.data?.data?.operators || [];
    
        if (!Array.isArray(operatorsData)) {
          throw new Error("Invalid response format");
        }
        
        // Filter out postpaid operators (only keep prepaid)
        const prepaidOperators = operatorsData.filter((operator: Operator) => {
          const operatorName = operator.operator_name.toLowerCase();
          return !operatorName.includes('postpaid');
        });
        

        setOperators(prepaidOperators);
        setFilteredOperators(prepaidOperators);
      } catch (error: any) {
        console.error("Error fetching operators:", error);
        setOperators([]); // Set to empty array on error
        setFilteredOperators([]);
        toast({
          title: "Error",
          description: error.response?.data?.message || error.message || "Failed to load operators",
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
        
        // Backend returns: { status, message, data: { circles: [...] } }
        const circlesData = response.data?.data?.circles || [];

        
        if (!Array.isArray(circlesData)) {
          throw new Error("Invalid response format");
        }
        
        setCircles(circlesData);
        setFilteredCircles(circlesData);
      } catch (error: any) {
        console.error("Error fetching circles:", error);
        setCircles([]); // Set to empty array on error
        setFilteredCircles([]);
        toast({
          title: "Error",
          description: error.response?.data?.message || error.message || "Failed to load circles",
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
      
      // Backend returns: { status, message, data: { recharges: [...] } }
      const historyData = response.data?.data?.recharges || [];
      
    
      
      if (!Array.isArray(historyData)) {
        throw new Error("Invalid response format");
      }
      
      setRechargeHistory(historyData);
    } catch (error: any) {
      console.error("Error fetching recharge history:", error);
      setRechargeHistory([]); // Set to empty array on error
      
      // Only show toast if it's not a "no data" error
      if (error.response?.status !== 404) {
        toast({
          title: "Error",
          description: error.response?.data?.message || error.message || "Failed to load recharge history",
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
        title: "Missing Information",
        description: "Please select operator and circle first",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingPlans(true);
    try {
      // Backend expects POST request with body: { operator_code: number, circle: number }
      const requestBody = {
        operator_code: parseInt(rechargeForm.operatorCode),
        circle: parseInt(rechargeForm.circleCode), // Send circle_code as 'circle'
      };



      // CORRECT: axios.post(url, data, config)
      const response = await axios.post(
        `${API_BASE_URL}/mobile_recharge/get/plans`,
        requestBody,           // Request body as second parameter
        getAuthHeaders()       // Auth headers as third parameter
      );



      // Backend returns: { status: "success", message: "...", data: { error, msg, planData: [...], status } }
      // planData is an array with one object containing circle_id and plan object
      const apiData = response.data?.data;
      
      if (apiData?.planData && Array.isArray(apiData.planData) && apiData.planData.length > 0) {
        const planData = apiData.planData[0]; // Get first item from planData array
        const planObject = planData.plan; // This is an object with category keys
        

        
        // Convert the plan object to a flat array of plans with category info
        const allPlans: Plan[] = [];
        
        // Iterate through each category in the plan object
        Object.keys(planObject).forEach((category) => {
          const categoryPlans = planObject[category];
          if (Array.isArray(categoryPlans)) {
            categoryPlans.forEach((plan: any) => {
              allPlans.push({
                rs: plan.amount,
                desc: plan.planDescription || plan.planName || '',
                validity: plan.validity || 'NA',
                category: category, // Add category name
                planName: plan.planName,
                ...plan // Include all other fields
              });
            });
          }
        });
        

        
        if (allPlans.length > 0) {
          setPlans(allPlans);
          setShowPlansDialog(true);
        } else {
          toast({
            title: "No Plans Found",
            description: "No plans available for this selection",
            variant: "destructive",
          });
        }
      } else {
   
        toast({
          title: "No Plans Found",
          description: response.data?.message || "No plans available for this selection",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error fetching plans:", error);
      console.error("Error response:", error.response?.data);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load plans",
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
      title: "Plan Selected",
      description: `₹${plan.rs} plan selected`,
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
        title: "Error",
        description: "User ID not found. Please login again.",
        variant: "destructive",
      });
      return;
    }

    // Validation
    if (!validateMobileNumber(rechargeForm.mobileNumber)) {
      toast({
        title: "Invalid Mobile Number",
        description: "Please enter a valid 10-digit mobile number",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(rechargeForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (amount < 10) {
      toast({
        title: "Amount Too Low",
        description: "Minimum recharge amount is ₹10",
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
          mobile_number: parseInt(rechargeForm.mobileNumber), // Convert string to number
          operator_code: parseInt(rechargeForm.operatorCode),
          operator_name: rechargeForm.operatorName,
          amount: amount,
          circle_code: parseInt(rechargeForm.circleCode),
          circle_name: rechargeForm.circleName,
          recharge_type: "1", // Always "1" for prepaid
          partner_request_id: `REQ_${Date.now()}`,
          commision: 0,
          status: "pending",
        },
        getAuthHeaders()
      );

      // Backend returns: { status: "success", message: "mobile recharge successfull" }
      if (response.status === 200 || response.status === 201) {
        const responseMessage = response.data?.message || "Mobile recharge initiated successfully";
        
        toast({
          title: "Success",
          description: responseMessage,
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

      let errorMessage = "Failed to process recharge. Please try again.";

      // Backend error format: { status: "failed", message: "error message" }
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 400) {
        errorMessage = "Invalid request data";
      } else if (error.response?.status === 401) {
        errorMessage = "Authentication failed. Please login again.";
      } else if (error.response?.status === 402) {
        errorMessage = "Insufficient balance";
      }

      toast({
        title: "Error",
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
                  Quick and easy mobile recharge for all operators
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
                        <p className="text-xs text-amber-600">
                          Enter complete 10-digit mobile number (
                          {rechargeForm.mobileNumber.length}/10)
                        </p>
                      )}
                    {rechargeForm.mobileNumber.length === 10 &&
                      !validateMobileNumber(rechargeForm.mobileNumber) && (
                        <p className="text-xs text-red-600">
                          Invalid mobile number format
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
                          <SelectValue placeholder={isLoadingOperators ? "Loading operators..." : "Select operator"} />
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
                              <SelectItem value="loading" disabled>
                                Loading operators...
                              </SelectItem>
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
                                No operators found for "{operatorSearchQuery}"
                              </div>
                            ) : (
                              <SelectItem value="no-operators" disabled>
                                No operators available
                              </SelectItem>
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
                          <SelectValue placeholder={isLoadingCircles ? "Loading circles..." : "Select circle"} />
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
                              <SelectItem value="loading" disabled>
                                Loading circles...
                              </SelectItem>
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
                                No circles found for "{circleSearchQuery}"
                              </div>
                            ) : (
                              <SelectItem value="no-circles" disabled>
                                No circles available
                              </SelectItem>
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
                      Amount <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                          ₹
                        </span>
                        <Input
                          id="amount"
                          type="number"
                          placeholder="Enter amount"
                          value={rechargeForm.amount}
                          onChange={(e) =>
                            setRechargeForm({
                              ...rechargeForm,
                              amount: e.target.value,
                            })
                          }
                          min="10"
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
                      >
                        {isLoadingPlans ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
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
                        <p className="text-xs text-amber-600">
                          Minimum recharge amount is ₹10
                        </p>
                      )}
                  </div>

                  {/* Information Box */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      Important Information:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Ensure you have sufficient balance in your account</li>
                      <li>Recharge will be processed instantly</li>
                      <li>Check your mobile number carefully before submitting</li>
                      <li>Transaction once done cannot be reversed</li>
                      <li>For any issues, contact support immediately</li>
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
                      parseFloat(rechargeForm.amount) < 10
                    }
                    className="w-full paybazaar-gradient text-white hover:opacity-90 transition-opacity h-12 text-base font-medium disabled:opacity-50"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <svg
                          className="animate-spin h-4 w-4"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Processing Recharge...
                      </span>
                    ) : (
                      <>
                        <Smartphone className="w-4 h-4 mr-2" />
                        Recharge Now
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
                  >
                    {isLoadingHistory ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Refresh
                      </>
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-6">
                {isLoadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : rechargeHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Smartphone className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No recharge history found</p>
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
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-base">
                                {history.mobile_number}
                              </p>
                              {getStatusBadge(history.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {history.operator_name} • {history.circle_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(history.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg text-primary">
                              ₹{history.amount.toFixed(2)}
                            </p>
                            {history.commision > 0 && (
                              <p className="text-xs text-green-600">
                                Commission: ₹{history.commision.toFixed(2)}
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
              Select a plan to auto-fill the recharge amount
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
                      <p>No plans available in this category</p>
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
                              Select Plan
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