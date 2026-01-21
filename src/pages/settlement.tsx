import { useState, useEffect, FormEvent } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Eye, CheckCircle2, Trash2, X, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AddBeneficiaryDialog } from "@/components/dialogs/AddBeneficiaryDialog";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

interface DecodedToken {
  admin_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  exp: number;
  iat: number;
}

interface Beneficiary {
  beneficiary_id: number;
  retailer_id: string;
  mobile_number: string;
  bank_name: string;
  beneficiary_name: string;
  account_number: string;
  ifsc_code: string;
  phone: string;
}


export default function Settlement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showLoginDialog, setShowLoginDialog] = useState(true);
  const [payoutPhoneNumber, setPayoutPhoneNumber] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAddBeneficiary, setShowAddBeneficiary] = useState(false);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingBeneficiaries, setFetchingBeneficiaries] = useState(false);
  const [tokenData, setTokenData] = useState<DecodedToken | null>(null);
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [beneficiaryToDelete, setBeneficiaryToDelete] = useState<Beneficiary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [showMpinVerificationDialog, setShowMpinVerificationDialog] = useState(false);
  const [verifiedMpin, setVerifiedMpin] = useState("");
  const [mpinVerificationError, setMpinVerificationError] = useState<string | null>(null);
  
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  const [payFormData, setPayFormData] = useState({
    transactionType: "",
    amount: "",
  });

  const fetchBeneficiaries = async (phoneNumber: string) => {
    try {
      setFetchingBeneficiaries(true);
      const token = localStorage.getItem("authToken");
      
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/payout_beneficiary/mobile/${phoneNumber}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("=== Fetch Beneficiaries Response ===");
      console.log("Response:", response.data);
      console.log("====================================");

      if (response.data.status === "success" && response.data.data) {
        setBeneficiaries(response.data.data);
      } else {
        setBeneficiaries([]);
      }
    } catch (error: any) {
      console.error("Error fetching beneficiaries:", error);
      setBeneficiaries([]);
      if (error.response?.status !== 404) {
        toast({
          title: "Error",
          description: "Failed to fetch beneficiaries",
          variant: "destructive",
        });
      }
    } finally {
      setFetchingBeneficiaries(false);
    }
  };

  useEffect(() => {
    const checkTokenData = () => {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      try {
        const decoded: DecodedToken = jwtDecode(token);
        console.log("=== Decoded Token ===");
        console.log("Token Data:", decoded);
        console.log("User ID:", decoded.user_id);
        console.log("User Name:", decoded.user_name);
        console.log("User Role:", decoded.user_role);
        console.log("Admin ID:", decoded.admin_id);
        console.log("=====================");
        
        setTokenData(decoded);
      } catch (error) {
        console.error("Error decoding token:", error);
      }
    };

    checkTokenData();
  }, []);

  useEffect(() => {
    if (showSuccessAnimation && transactionId) {
      const timer = setTimeout(() => {
        setShowSuccessAnimation(false);
        localStorage.setItem('autoOpenReceipt', transactionId);
        navigate('/reports', { state: { openReceiptFor: transactionId } });
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [showSuccessAnimation, transactionId, navigate]);

  const handleLogin = async () => {
    if (!payoutPhoneNumber) {
      toast({
        title: "Error",
        description: "Please enter Phone Number",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsAuthenticated(true);
      setShowLoginDialog(false);
      
      const token = localStorage.getItem("authToken");
      if (token) {
        try {
          const decoded: DecodedToken = jwtDecode(token);
          console.log("=== Login - Decoded Token ===");
          console.log("Token Data:", decoded);
          console.log("=============================");
          
          setTokenData(decoded);
        } catch (error) {
          console.error("Error checking token:", error);
        }
      }
      
      await fetchBeneficiaries(payoutPhoneNumber);
      
      toast({
        title: "Login Successful",
        description: "Welcome to Payout Services",
      });
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.response?.data?.message || "Invalid credentials",
        variant: "destructive",
      });
    }
  };

  const handleAddBeneficiary = async () => {
    if (payoutPhoneNumber) {
      await fetchBeneficiaries(payoutPhoneNumber);
    }
  };

  const handleDeleteClick = (beneficiary: Beneficiary) => {
    setBeneficiaryToDelete(beneficiary);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!beneficiaryToDelete) return;

    try {
      setIsDeleting(true);
      const token = localStorage.getItem("authToken");
      
      const response = await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL}/payout_beneficiary/delete/${beneficiaryToDelete.beneficiary_id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 204 || response.status === 200 || response.data?.status === "success") {
        toast({
          title: "Success",
          description: `${beneficiaryToDelete.beneficiary_name} deleted successfully`,
        });
        
        if (payoutPhoneNumber) {
          await fetchBeneficiaries(payoutPhoneNumber);
        }
        
        setShowDeleteDialog(false);
        setBeneficiaryToDelete(null);
      } else {
        toast({
          title: "Error",
          description: response.data?.message || "Failed to delete beneficiary. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete beneficiary. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePayClick = (beneficiary: Beneficiary) => {
    setSelectedBeneficiary(beneficiary);
    setPayFormData({
      transactionType: "",
      amount: "",
    });
    setShowPayDialog(true);
  };

  const handleMpinVerificationInput = (value: string) => {
    if (/^\d{0,4}$/.test(value)) {
      setVerifiedMpin(value);
      setMpinVerificationError(null);
    }
  };

  const handleMpinVerification = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (verifiedMpin.length !== 4) {
      setMpinVerificationError("MPIN must be exactly 4 digits.");
      return;
    }

    setShowMpinVerificationDialog(false);
    setMpinVerificationError(null);
    
    await submitPayout();
  };

  const handlePaySubmit = async () => {
    if (!selectedBeneficiary) return;

    if (!payFormData.transactionType || !payFormData.amount) {
      toast({
        title: "Error",
        description: "Please fill all fields",
        variant: "destructive",
      });
      return;
    }

    setShowMpinVerificationDialog(true);
    setVerifiedMpin("");
    setMpinVerificationError(null);
  };

  const submitPayout = async () => {
    if (!selectedBeneficiary) return;

    if (!verifiedMpin || verifiedMpin.length !== 4) {
      toast({
        title: "Error",
        description: "Please verify your MPIN first.",
        variant: "destructive",
      });
      setShowMpinVerificationDialog(true);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      
      if (!tokenData?.user_id || !tokenData?.admin_id) {
        toast({
          title: "Error",
          description: "User ID not found. Please log in again.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      const payload = {
        admin_id: tokenData.admin_id,
        retailer_id: tokenData.user_id,
        mobile_number: selectedBeneficiary.mobile_number,
        beneficiary_bank_name: selectedBeneficiary.bank_name,
        beneficiary_name: selectedBeneficiary.beneficiary_name,
        beneficiary_account_number: selectedBeneficiary.account_number,
        beneficiary_ifsc_code: selectedBeneficiary.ifsc_code,
        amount: parseFloat(payFormData.amount),
        transfer_type: payFormData.transactionType,
        mpin: parseInt(verifiedMpin),
      };

      console.log("=== Payout Request Payload ===");
      console.log("Payload:", payload);
      console.log("==============================");

      const response = await axios.post(
        `https://server.paybazaar.in/payout/create`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("=== Payout Response ===");
      console.log("Response:", response.data);
      console.log("=======================");

      const txnId = response.data?.data?.orderid || 
                    response.data?.data?.transaction_id || 
                    Date.now().toString();

      setShowPayDialog(false);
      setTransactionId(txnId);
      setShowSuccessAnimation(true);
      
      setPayFormData({
        transactionType: "",
        amount: "",
      });
      setVerifiedMpin("");
      
      if (payoutPhoneNumber) {
        await fetchBeneficiaries(payoutPhoneNumber);
      }
    } catch (error: any) {
      console.error("=== Payout Error ===");
      console.error("Error:", error.response?.data);
      console.error("====================");
      
      setVerifiedMpin("");
      const errorMessage = error.response?.data?.message || error.response?.data?.error || "Invalid MPIN or request failed. Please try again.";
      setMpinVerificationError(errorMessage);
      
      if (error.response?.status === 401 || error.response?.status === 403 || error.response?.data?.message?.toLowerCase().includes("mpin")) {
        setShowMpinVerificationDialog(true);
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen bg-background w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col w-full">
          <Header />

          <div className="paybazaar-gradient rounded-lg p-6 text-white m-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/services")}
                className="text-white hover:bg-slate-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Remitter Login</h1>
                <p className="text-white/90">
                  Enter your phone number to access payout services
                </p>
              </div>
            </div>
          </div>
          <div className="flex-1 flex justify-center p-6">
            <div className="w-full max-w-xl">
              <div className="bg-card rounded-lg border border-border shadow-lg p-8">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleLogin();
                  }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <Label
                      htmlFor="phoneNumber"
                      className="text-sm font-medium text-foreground"
                    >
                      Mobile Number <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="phoneNumber"
                        type="tel"
                        value={payoutPhoneNumber}
                        onChange={(e) =>
                          setPayoutPhoneNumber(
                            e.target.value.replace(/\D/g, "").slice(0, 10)
                          )
                        }
                        placeholder="Enter Mobile Number"
                        className="h-12 border-2 border-border focus:border-primary transition-colors pr-10"
                        maxLength={10}
                        required
                      />
                      {payoutPhoneNumber && (
                        <button
                          type="button"
                          onClick={() => setPayoutPhoneNumber("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-12 paybazaar-gradient text-white hover:opacity-90 shadow-lg font-semibold"
                  >
                    Submit
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background w-full">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main className="flex-1 overflow-auto bg-muted/20">
          <div className="paybazaar-gradient text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(-1)}
                  className="text-white hover:bg-white/20"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-2xl font-bold">Settlement</h1>
              </div>
              <Button
                onClick={() => setShowAddBeneficiary(true)}
                className="bg-white text-primary hover:bg-white/90"
              >
                + Add Bene
              </Button>
            </div>
          </div>

          <div className="p-6">
            <div className="bg-card rounded-lg border border-border shadow-lg overflow-hidden">
              <div className="paybazaar-gradient p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-white font-medium">Show</span>
                    <Select defaultValue="10">
                      <SelectTrigger className="w-20 h-9 bg-white/10 border-white/20 text-white hover:bg-white/20">
                        <SelectValue className="text-white" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-white font-medium">
                      entries
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-white font-medium">
                      Search:
                    </span>
                    <Input
                      className="w-56 h-9 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20"
                      placeholder="Search..."
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="w-full min-w-full">
                  <Table>
                    <TableHeader>
                      <TableRow className="paybazaar-gradient hover:opacity-95">
                        <TableHead className="font-bold text-white text-center w-[180px] min-w-[180px]">
                          BENEFICIARY NAME
                        </TableHead>
                        <TableHead className="font-bold text-white text-center w-[180px] min-w-[180px]">
                          BANK NAME
                        </TableHead>
                        <TableHead className="font-bold text-white text-center w-[140px] min-w-[140px]">
                          IFSC
                        </TableHead>
                        <TableHead className="font-bold text-white text-center w-[180px] min-w-[180px]">
                          ACCOUNT NUMBER
                        </TableHead>
                        <TableHead className="font-bold text-white text-center w-[150px] min-w-[150px]">
                          MOBILE NUMBER
                        </TableHead>
                        <TableHead className="font-bold text-white text-center w-[120px] min-w-[120px]">
                          PAY
                        </TableHead>
                       
                        <TableHead className="font-bold text-white text-center w-[120px] min-w-[120px]">
                          DELETE
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fetchingBeneficiaries ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-16">
                            <div className="flex flex-col items-center justify-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                              <p className="text-sm text-muted-foreground">Loading beneficiaries...</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : beneficiaries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-16">
                            <div className="flex flex-col items-center justify-center">
                              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
                                <Eye className="h-10 w-10 text-muted-foreground" />
                              </div>
                              <p className="text-lg font-semibold text-foreground mb-2">
                                No beneficiaries found
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Click "+ Add Bene" to add a new beneficiary
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        beneficiaries.map((beneficiary, index) => (
                          <TableRow
                            key={beneficiary.beneficiary_id}
                            className={`hover:bg-muted/50 transition-colors ${
                              index % 2 === 0 ? "bg-background" : "bg-muted/20"
                            }`}
                          >
                            <TableCell className="text-center font-medium py-4">
                              {beneficiary.beneficiary_name}
                            </TableCell>
                            <TableCell className="text-center py-4">
                              {beneficiary.bank_name}
                            </TableCell>
                            <TableCell className="text-center py-4 font-mono text-sm">
                              {beneficiary.ifsc_code}
                            </TableCell>
                            <TableCell className="text-center py-4 font-mono text-sm">
                              {beneficiary.account_number}
                            </TableCell>
                            <TableCell className="text-center py-4 font-mono">
                              {beneficiary.phone || beneficiary.mobile_number}
                            </TableCell>
                            <TableCell className="text-center py-4">
                              <Button
                                size="sm"
                                onClick={() => handlePayClick(beneficiary)}
                                className="paybazaar-gradient text-white hover:opacity-90 shadow-md"
                            
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Pay
                              </Button>
                            </TableCell>
                           
                            <TableCell className="text-center py-4">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteClick(beneficiary)}
                                className="shadow-md"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {showSuccessAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-ping"
                  style={{
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: '1.5s',
                    left: `${50 + 40 * Math.cos((i * Math.PI * 2) / 12)}%`,
                    top: `${50 + 40 * Math.sin((i * Math.PI * 2) / 12)}%`,
                  }}
                />
              ))}
            </div>

            <div className="relative bg-white rounded-3xl shadow-2xl p-12 max-w-md mx-4 animate-scale-in">
              <div className="relative mx-auto w-32 h-32 mb-6">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 animate-pulse" />
                
                <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
                  <CheckCircle2 
                    className="w-20 h-20 text-green-500 animate-check-draw" 
                    strokeWidth={3}
                  />
                </div>
              </div>

              <div className="text-center space-y-3">
                <h2 className="text-3xl font-bold text-gray-900">
                  Success!
                </h2>
                <p className="text-lg text-gray-600">
                  Payout completed successfully
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <AddBeneficiaryDialog
        open={showAddBeneficiary}
        onOpenChange={setShowAddBeneficiary}
        onAdd={handleAddBeneficiary}
        mobileNumber={payoutPhoneNumber}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Beneficiary
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Are you sure you want to delete this beneficiary?</p>
              {beneficiaryToDelete && (
                <div className="mt-4 p-4 bg-muted rounded-lg border">
                  <p className="font-semibold text-foreground mb-2">
                    {beneficiaryToDelete.beneficiary_name}
                  </p>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">Bank:</span>{" "}
                      <span className="text-foreground">{beneficiaryToDelete.bank_name}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Account:</span>{" "}
                      <span className="text-foreground font-mono">{beneficiaryToDelete.account_number}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">IFSC:</span>{" "}
                      <span className="text-foreground font-mono">{beneficiaryToDelete.ifsc_code}</span>
                    </p>
                  </div>
                </div>
              )}
              <p className="text-destructive font-medium">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Payout Transaction
            </DialogTitle>
            <DialogDescription>
              Complete the payout transaction details
            </DialogDescription>
          </DialogHeader>

          {selectedBeneficiary && (
            <div className="space-y-4 py-4">
              <div className="space-y-2 p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">
                      Beneficiary Name:
                    </span>
                    <p className="font-medium">
                      {selectedBeneficiary.beneficiary_name}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Bank Name:</span>
                    <p className="font-medium">
                      {selectedBeneficiary.bank_name}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">IFSC:</span>
                    <p className="font-medium">{selectedBeneficiary.ifsc_code}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Account Number:
                    </span>
                    <p className="font-medium">
                      {selectedBeneficiary.account_number}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">
                      Mobile Number:
                    </span>
                    <p className="font-medium">
                      {selectedBeneficiary.mobile_number}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transactionType">Transfer Type *</Label>
                <Select
                  value={payFormData.transactionType}
                  onValueChange={(value) =>
                    setPayFormData({ ...payFormData, transactionType: value })
                  }
                  required
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select Transfer Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">IMPS</SelectItem>
                    <SelectItem value="6">NEFT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹) *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={payFormData.amount}
                  onChange={(e) =>
                    setPayFormData({ ...payFormData, amount: e.target.value })
                  }
                  placeholder="Enter amount"
                  className="h-11"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePaySubmit}
              className="paybazaar-gradient text-white"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Processing</span>
                </div>
              ) : (
                "Submit"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showMpinVerificationDialog}
        onOpenChange={(open) => {
          if (!loading) {
            setShowMpinVerificationDialog(open);
            if (!open) {
              setVerifiedMpin("");
              setMpinVerificationError(null);
            }
          }
        }}
      >
        <DialogContent
          className="sm:max-w-md bg-background border-border"
          onEscapeKeyDown={(event) => {
            if (loading) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (loading) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Enter Your MPIN
            </DialogTitle>
            <DialogDescription>
              Please enter your 4-digit MPIN to submit the payout request.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleMpinVerification} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verifyMpin">MPIN</Label>
              <Input
                id="verifyMpin"
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={verifiedMpin}
                maxLength={4}
                placeholder="Enter 4-digit MPIN"
                onChange={(event) => handleMpinVerificationInput(event.target.value)}
                required
                className="text-center tracking-[0.5em]"
                disabled={loading}
                autoFocus
              />
            </div>

            {mpinVerificationError && (
              <p className="text-sm text-destructive font-medium">
                {mpinVerificationError}
              </p>
            )}

            <DialogFooter className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={loading}
                onClick={() => {
                  setShowMpinVerificationDialog(false);
                  setVerifiedMpin("");
                  setMpinVerificationError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 paybazaar-gradient text-white hover:opacity-90"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Processing</span>
                  </div>
                ) : (
                  "Submit"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes scale-in {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes check-draw {
          0% {
            stroke-dasharray: 0 100;
          }
          100% {
            stroke-dasharray: 100 100;
          }
        }

        .animate-scale-in {
          animation: scale-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .animate-check-draw {
          animation: check-draw 0.8s ease-in-out 0.3s forwards;
        }
      `}</style>
    </div>
  );
}