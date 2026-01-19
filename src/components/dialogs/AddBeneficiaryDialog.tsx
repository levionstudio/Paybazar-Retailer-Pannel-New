import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import {
  Dialog,
  DialogContent,
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, ChevronDown } from "lucide-react";

interface AddBeneficiaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd?: (data: BeneficiaryFormData) => void;
  mobileNumber?: string;
}

interface BeneficiaryFormData {
  bank: string;
  ifsc: string;
  accountNumber: string;
  beneficiaryName: string;
}

interface Bank {
  bank_name: string;
  ifsc_code: string;
}

interface DecodedToken {
  admin_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  exp: number;
  iat: number;
}

export function AddBeneficiaryDialog({
  open,
  onOpenChange,
  onAdd,
  mobileNumber = "",
}: AddBeneficiaryDialogProps) {
  const { toast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<BeneficiaryFormData>({
    bank: "",
    ifsc: "",
    accountNumber: "",
    beneficiaryName: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedBankIFSC, setSelectedBankIFSC] = useState("");
  const [isAccountVerified, setIsAccountVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [bankSearchTerm, setBankSearchTerm] = useState("");
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);

  const getRetailerIdFromToken = (): string => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return "";
      
      const decoded = jwtDecode<DecodedToken>(token);
      return decoded.user_id || "";
    } catch (error) {
      console.error("Error decoding token:", error);
      return "";
    }
  };

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("authToken");
        const response = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/bank/get/all`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.data.status === "success" && response.data.data?.banks) {
          setBanks(response.data.data.banks);
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to fetch banks. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchBanks();
    }
  }, [open, toast]);

  useEffect(() => {
    if (!open) {
      setFormData({
        bank: "",
        ifsc: "",
        accountNumber: "",
        beneficiaryName: "",
      });
      setErrors({});
      setSelectedBankIFSC("");
      setIsAccountVerified(false);
      setBankSearchTerm("");
      setShowVerificationDialog(false);
    }
  }, [open]);

  useEffect(() => {
    setIsAccountVerified(false);
  }, [formData.accountNumber, formData.ifsc]);

  const filteredBanks = banks.filter((bank) =>
    bank.bank_name.toLowerCase().includes(bankSearchTerm.toLowerCase())
  );

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.bank) newErrors.bank = "Please select a bank";
    if (!formData.ifsc) newErrors.ifsc = "IFSC code is required";
    if (formData.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifsc)) {
      newErrors.ifsc = "Invalid IFSC code format";
    }
    if (!formData.accountNumber)
      newErrors.accountNumber = "Account number is required";
    if (formData.accountNumber && formData.accountNumber.length < 9) {
      newErrors.accountNumber = "Account number must be at least 9 digits";
    }
    if (!formData.beneficiaryName)
      newErrors.beneficiaryName = "Beneficiary name is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleVerifyAccountClick = () => {
    if (!formData.ifsc || !formData.accountNumber) {
      setErrors({
        ...errors,
        verify: "Please enter IFSC and Account Number first",
      });
      setIsAccountVerified(false);
      return;
    }

    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifsc)) {
      setErrors({
        ...errors,
        verify: "Invalid IFSC code format",
      });
      setIsAccountVerified(false);
      return;
    }

    if (formData.accountNumber.length < 9) {
      setErrors({
        ...errors,
        verify: "Account number must be at least 9 digits",
      });
      setIsAccountVerified(false);
      return;
    }

    if (!mobileNumber) {
      setErrors({
        ...errors,
        verify: "Phone number is required for verification",
      });
      setIsAccountVerified(false);
      return;
    }

    setShowVerificationDialog(true);
  };

  const handleVerifyAccount = async () => {
    try {
      setIsVerifying(true);
      setErrors({ ...errors, verify: "" });
      
      const token = localStorage.getItem("authToken");
      const retailerId = getRetailerIdFromToken();

      if (!retailerId) {
        throw new Error("Retailer ID not found. Please login again.");
      }
      
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/user/payout/${retailerId}/${mobileNumber}/${formData.accountNumber}/${formData.ifsc}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      if (response.data.status === true && response.data.status_code === 0) {
        setIsAccountVerified(true);
        setErrors({ ...errors, verify: "" });
        
        if (response.data.data?.c_name) {
          setFormData(prev => ({
            ...prev,
            beneficiaryName: response.data.data.c_name
          }));
        }
        
        toast({
          title: "Account Verified",
          description: response.data.data?.c_name 
            ? `Account verified for ${response.data.data.c_name}` 
            : "Account number has been verified successfully",
        });
      } else {
        throw new Error(response.data.message || "Verification failed");
      }
      
    } catch (error: any) {
      setIsAccountVerified(false);
      setErrors({
        ...errors,
        verify: error.response?.data?.message || error.message || "Failed to verify account. Please try again.",
      });
      toast({
        title: "Verification Failed",
        description: error.response?.data?.message || error.message || "Failed to verify account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (!mobileNumber) {
      toast({
        title: "Missing Phone Number",
        description: "Mobile number not found. Please login again.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem("authToken");
      const retailerId = getRetailerIdFromToken();

      if (!retailerId) {
        throw new Error("Retailer ID not found. Please login again.");
      }
      
      const payload = {
        retailer_id: retailerId,
        mobile_number: mobileNumber,
        bank_name: formData.bank,
        beneficiary_name: formData.beneficiaryName,
        account_number: formData.accountNumber,
        ifsc_code: formData.ifsc,
        phone: mobileNumber,
      };

      console.log("=== Add Beneficiary Payload ===");
      console.log("Payload:", payload);
      console.log("===============================");

      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/retailer-beneficiary/create`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("=== Add Beneficiary Response ===");
      console.log("Response:", response.data);
      console.log("================================");

      if (response.data.status === "success") {
        toast({
          title: "Success",
          description: "Beneficiary added successfully",
        });

        if (onAdd) {
          onAdd(formData);
        }

        setFormData({
          bank: "",
          ifsc: "",
          accountNumber: "",
          beneficiaryName: "",
        });
        setErrors({});
        setSelectedBankIFSC("");
        setBankSearchTerm("");
        setIsAccountVerified(false);
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error("=== Add Beneficiary Error ===");
      console.error("Error:", error.response?.data);
      console.error("=============================");
      
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to add beneficiary",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      bank: "",
      ifsc: "",
      accountNumber: "",
      beneficiaryName: "",
    });
    setErrors({});
    setSelectedBankIFSC("");
    setBankSearchTerm("");
    setIsAccountVerified(false);
    onOpenChange(false);
  };

  const handleBankChange = (bankName: string) => {
    const selectedBank = banks.find((b) => b.bank_name === bankName);
    if (selectedBank) {
      setSelectedBankIFSC(selectedBank.ifsc_code);
      setFormData({
        ...formData,
        bank: bankName,
        ifsc: selectedBank.ifsc_code,
      });
    }
  };

  const handleIFSCChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    
    if (value.length > 11) {
      value = value.substring(0, 11);
    }
    
    setFormData({ ...formData, ifsc: value });
    if (selectedBankIFSC && value !== selectedBankIFSC) {
      setSelectedBankIFSC("");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] bg-background border-border">
          <DialogHeader className="text-center">
            <DialogTitle className="text-lg font-semibold tracking-wider">
              ADD BENEFICIARY
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            {/* Bank Selection */}
            <div className="space-y-2">
              <Label htmlFor="bank" className="text-sm font-medium">
                Select Bank
              </Label>
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between text-left font-normal"
                  onClick={() => setIsSelectOpen(!isSelectOpen)}
                >
                  <span className={formData.bank ? "" : "text-muted-foreground"}>
                    {formData.bank || "--Select Bank--"}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
                
                {isSelectOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40 bg-black/20"
                      onClick={() => setIsSelectOpen(false)}
                    />
                    
                    <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg z-50 max-h-[300px] flex flex-col">
                      <div className="p-2 border-b border-border sticky top-0 bg-background">
                        <Input
                          ref={searchInputRef}
                          placeholder="Search bank..."
                          className="h-9"
                          type="text"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck="false"
                          style={{ fontSize: '16px' }}
                          value={bankSearchTerm}
                          onChange={(e) => setBankSearchTerm(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                            }
                          }}
                          autoFocus
                        />
                      </div>
                      
                      <div className="overflow-y-auto max-h-[250px]">
                        {loading ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            Loading banks...
                          </div>
                        ) : filteredBanks.length > 0 ? (
                          filteredBanks.map((bank) => (
                            <button
                              key={bank.bank_name}
                              type="button"
                              className="w-full text-left px-4 py-3 hover:bg-muted transition-colors text-sm border-b border-border last:border-b-0"
                              onClick={() => {
                                handleBankChange(bank.bank_name);
                                setIsSelectOpen(false);
                                setBankSearchTerm("");
                              }}
                            >
                              {bank.bank_name}
                            </button>
                          ))
                        ) : (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            {bankSearchTerm ? "No banks match your search" : "No banks found"}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
              {errors.bank && (
                <p className="text-red-500 text-xs">{errors.bank}</p>
              )}
            </div>

            {/* IFSC */}
            <div className="space-y-2">
              <Label htmlFor="ifsc" className="text-sm font-medium">
                IFSC
              </Label>
              <Input
                id="ifsc"
                type="text"
                value={formData.ifsc}
                onChange={handleIFSCChange}
                placeholder="Enter IFSC"
                className="uppercase"
                maxLength={11}
              />
              {errors.ifsc && (
                <p className="text-red-500 text-xs">{errors.ifsc}</p>
              )}
            </div>

            {/* Account Number */}
            <div className="space-y-2">
              <Label htmlFor="accountNumber" className="text-sm font-medium">
                Account Number
              </Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="accountNumber"
                  type="number"
                  inputMode="numeric"
                  value={formData.accountNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, accountNumber: e.target.value })
                  }
                  placeholder="Enter Account Number"
                />
                <Button
                  type="button"
                  onClick={handleVerifyAccountClick}
                  disabled={isVerifying}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded whitespace-nowrap disabled:opacity-50"
                >
                  {isVerifying ? "Verifying..." : "Verify A/C"}
                </Button>
              </div>
              {errors.accountNumber && (
                <p className="text-red-500 text-xs">{errors.accountNumber}</p>
              )}
              {errors.verify && (
                <p className="text-red-500 text-xs">{errors.verify}</p>
              )}
              {isAccountVerified && !errors.verify && (
                <p className="text-green-600 text-xs flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Account verified successfully
                </p>
              )}
            </div>

            {/* Beneficiary Name */}
            <div className="space-y-2">
              <Label htmlFor="beneficiaryName" className="text-sm font-medium">
                Beneficiary Name
              </Label>
              <Input
                id="beneficiaryName"
                type="text"
                value={formData.beneficiaryName}
                onChange={(e) =>
                  setFormData({ ...formData, beneficiaryName: e.target.value })
                }
                placeholder="Enter Beneficiary Name"
              />
              {errors.beneficiaryName && (
                <p className="text-red-500 text-xs">{errors.beneficiaryName}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="button"
                onClick={handleCancel}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 paybazaar-gradient text-white"
                disabled={isSubmitting || loading}
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Verification Confirmation Dialog */}
      <AlertDialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Verify Account Number?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to verify this account number?</p>
              <p className="font-semibold text-orange-600">
                A verification charge of ₹3 will be deducted from your account.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowVerificationDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowVerificationDialog(false);
                handleVerifyAccount();
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, Verify
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}