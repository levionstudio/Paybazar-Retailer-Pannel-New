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
          console.error("❌ Invalid response format - operators is not an array");
          throw new Error("Invalid response format");
        }
        
        // Filter for postpaid operators only
        const postpaidOperators = operatorsData.filter((operator: Operator) => {
          const operatorName = operator.operator_name.toLowerCase();
          return operatorName.includes('postpaid');
        });
 
        
        setOperators(postpaidOperators);
        setFilteredOperators(postpaidOperators);
      } catch (error: any) {
      
        
        setOperators([]);
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
        
 
        
        const circlesData = response.data?.data?.circles || [];
 
        
        if (!Array.isArray(circlesData)) {
     
          throw new Error("Invalid response format");
        }
        
        setCircles(circlesData);
        setFilteredCircles(circlesData);
      } catch (error: any) {
     
        setCircles([]);
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

  // Fetch postpaid recharge history from BBPS endpoint
  const fetchRechargeHistory = async () => {
    if (!retailerId) return;

    setIsLoadingHistory(true);
    

    
    try {
      const response = await axios.get(
        `${API_BASE_URL}/bbps/recharge/get/${retailerId}`,
        getAuthHeaders()
      );
      

      
      // Backend returns: { status, message, data: { history: [...] } }
      const historyData = response.data?.data?.history || [];

      
      if (!Array.isArray(historyData)) {
        console.error("❌ Invalid response format - history is not an array");
        throw new Error("Invalid response format");
      }
      
      setRechargeHistory(historyData);

    } catch (error: any) {

      setRechargeHistory([]);
      
      if (error.response?.status !== 404) {
        toast({
          title: "Error",
          description: error.response?.data?.message || error.message || "Failed to load postpaid recharge history",
          variant: "destructive",
        });
      } else {
 
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
        title: "Missing Information",
        description: "Please enter mobile number and select operator",
        variant: "destructive",
      });
      return;
    }

    if (!validateMobileNumber(rechargeForm.mobileNumber)) {
      toast({
        title: "Invalid Mobile Number",
        description: "Please enter a valid 10-digit mobile number",
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



      // Backend returns: { status, message, data: { response: { error, msg, status, billAmount: [...] } } }
      // billAmount is an ARRAY with one object
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
            title: "Bill Fetched Successfully",
            description: `Bill amount: ₹${parsedBillData.billAmount.toFixed(2)}`,
          });
        } else {

          toast({
            title: "Bill Not Available",
            description: "This bill does not accept payment at the moment",
            variant: "destructive",
          });
        }
      } else {
      
        
        toast({
          title: "Bill Not Available",
          description: response.data?.data?.response?.msg || "Unable to fetch bill details",
          variant: "destructive",
        });
      }
    } catch (error: any) {

      
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to fetch bill details",
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

    if (!rechargeForm.circleCode) {
      toast({
        title: "Missing Information",
        description: "Please select a circle",
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
          title: "Success",
          description: responseMessage,
        });

     
        setBillDetails(null);

        // Refresh history
        fetchRechargeHistory();
      }
    } catch (error: any) {


      let errorMessage = "Failed to process payment. Please try again.";

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
              onClick={() => navigate(-1)}
              className="mb-4 hover:bg-muted"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
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
                  Pay your postpaid mobile bills instantly
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
                      >
                        {isFetchingBill ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
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
                                No postpaid operators available
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

                  {/* Bill Details */}
                  {billDetails && (
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3 border border-primary/20">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-primary" />
                        <p className="font-semibold text-foreground">Bill Details</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Customer Name</p>
                          <p className="font-medium text-foreground">{billDetails.userName}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Mobile Number</p>
                          <p className="font-medium text-foreground">{billDetails.cellNumber}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Bill Date</p>
                          <p className="font-medium text-foreground">{billDetails.billdate}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Due Date</p>
                          <p className="font-medium text-foreground">{billDetails.dueDate}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Bill Amount</p>
                          <p className="font-bold text-lg text-primary">₹{billDetails.billAmount.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Net Amount</p>
                          <p className="font-bold text-lg text-primary">₹{billDetails.billnetamount.toFixed(2)}</p>
                        </div>
                      </div>
                      <p className="text-xs text-blue-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Partial payment allowed - Pay any amount
                      </p>
                    </div>
                  )}

                  {/* Amount */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="amount"
                      className="text-sm font-medium text-foreground"
                    >
                      Amount <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
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
                        min="1"
                        step="0.01"
                        required
                        disabled={isLoading || !billDetails}
                        className="h-12 text-base pl-8"
                      />
                    </div>
                    {billDetails && parseFloat(rechargeForm.amount) > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Bill amount: ₹{billDetails.billAmount.toFixed(2)} • You can pay any amount
                      </p>
                    )}
                  </div>

                  {/* Information Box */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      Important Information:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Fetch bill details before making payment</li>
                      <li>Ensure you have sufficient balance in your account</li>
                      <li>Payment will be processed instantly</li>
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
                      !billDetails ||
                      parseFloat(rechargeForm.amount) <= 0
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
                        Processing Payment...
                      </span>
                    ) : (
                      <>
                        <Smartphone className="w-4 h-4 mr-2" />
                        Pay Bill Now
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
                    <p>No postpaid payment history found</p>
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
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-base">
                                {history.mobile_number}
                              </p>
                              {getStatusBadge(history.recharge_status)}
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
                            {history.commission > 0 && (
                              <p className="text-xs text-green-600">
                                Commission: ₹{history.commission.toFixed(2)}
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