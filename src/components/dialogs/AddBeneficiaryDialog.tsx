import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown } from "lucide-react";

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
  beneficiaryPhone: string; // ✅ NEW
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
  beneficiaryPhone: "", // ✅ NEW
});

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedBankIFSC, setSelectedBankIFSC] = useState("");
  const [bankSearchTerm, setBankSearchTerm] = useState("");
  const [isSelectOpen, setIsSelectOpen] = useState(false);

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
      beneficiaryPhone: "",
    });
    setErrors({});
    setSelectedBankIFSC("");
    setBankSearchTerm("");
  }
}, [open]);


  const filteredBanks = banks.filter((bank) =>
    bank.bank_name.toLowerCase().includes(bankSearchTerm.toLowerCase())
  );
const validateForm = () => {
  const newErrors: Record<string, string> = {};

  if (!formData.bank) newErrors.bank = "Please select a bank";

  if (!formData.ifsc) {
    newErrors.ifsc = "IFSC code is required";
  } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifsc)) {
    newErrors.ifsc = "Invalid IFSC code format";
  }

  if (!formData.accountNumber) {
    newErrors.accountNumber = "Account number is required";
  } else if (formData.accountNumber.length < 9) {
    newErrors.accountNumber = "Account number must be at least 9 digits";
  }

  if (!formData.beneficiaryName) {
    newErrors.beneficiaryName = "Beneficiary name is required";
  }

  if (!formData.beneficiaryPhone || formData.beneficiaryPhone.length !== 10) {
    newErrors.beneficiaryPhone = "Valid beneficiary mobile number is required";
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
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
  mobile_number: mobileNumber,             // ✅ remitter phone
  bank_name: formData.bank,
  beneficiary_name: formData.beneficiaryName,
  account_number: formData.accountNumber,
  ifsc_code: formData.ifsc,
  phone: formData.beneficiaryPhone,         // ✅ beneficiary phone
};


      console.log("=== Add Beneficiary Payload ===");
      console.log("Payload:", payload);
      console.log("===============================");

      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/payout_beneficiary/create`,
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
  beneficiaryPhone: "",
});

        setErrors({});
        setSelectedBankIFSC("");
        setBankSearchTerm("");
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
    beneficiaryPhone: "",
  });
  setErrors({});
  setSelectedBankIFSC("");
  setBankSearchTerm("");
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
            {errors.accountNumber && (
              <p className="text-red-500 text-xs">{errors.accountNumber}</p>
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
          {/* Beneficiary Phone */}
<div className="space-y-2">
  <Label htmlFor="beneficiaryPhone" className="text-sm font-medium">
    Beneficiary Mobile Number
  </Label>
  <Input
    id="beneficiaryPhone"
    type="tel"
    inputMode="numeric"
    maxLength={10}
    value={formData.beneficiaryPhone}
    onChange={(e) =>
      setFormData({
        ...formData,
        beneficiaryPhone: e.target.value.replace(/\D/g, "").slice(0, 10),
      })
    }
    placeholder="Enter Beneficiary Mobile Number"
  />
  {errors.beneficiaryPhone && (
    <p className="text-red-500 text-xs">{errors.beneficiaryPhone}</p>
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
  );
}