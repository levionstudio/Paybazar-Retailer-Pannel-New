import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Smartphone,
  CreditCard,
  Phone,
  IdCard,
  Banknote,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function AePS() {
  const [transactionType, setTransactionType] = useState("");
  const [selectedDevice, setSelectedDevice] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  const showAmountField =
    transactionType === "cash-withdrawal" || transactionType === "aadhaar-pay";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted");
  };

  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex w-full">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main className="flex-1 p-6 space-y-8 overflow-auto">
          {/* Header Section with Gradient (Reduced size) */}
          <div className="paybazaar-gradient rounded-xl p-6 text-white shadow-md">
            <div className="flex items-center space-x-3 mb-2">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/services")}
                className="text-white hover:bg-slate-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold">
                Aadhaar Enabled Payment System (AePS)
              </h1>
            </div>
            <p className="text-white/80 text-sm max-w-2xl leading-relaxed">
              Complete secure transactions using Aadhaar authentication and
              biometric verification.
            </p>
          </div>

          {/* Form Card */}
          <div className="max-w-3xl mx-auto">
            <div className="paybazaar-card p-10 rounded-2xl shadow-xl hover:shadow-2xl transition-shadow">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Mobile & Aadhaar Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="mobile"
                      className="text-sm font-semibold text-foreground"
                    >
                      Mobile Number *
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="mobile"
                        type="tel"
                        placeholder="Enter Mobile Number"
                        className="paybazaar-input pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="aadhaar"
                      className="text-sm font-semibold text-foreground"
                    >
                      Aadhaar Number *
                    </Label>
                    <div className="relative">
                      <IdCard className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="aadhaar"
                        type="text"
                        placeholder="Enter Aadhaar Number"
                        className="paybazaar-input pl-10"
                        maxLength={12}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Bank Name */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">
                    Bank Name *
                  </Label>
                  <Select required>
                    <SelectTrigger className="paybazaar-input">
                      <SelectValue placeholder="--Select Bank--" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sbi">State Bank of India</SelectItem>
                      <SelectItem value="hdfc">HDFC Bank</SelectItem>
                      <SelectItem value="icici">ICICI Bank</SelectItem>
                      <SelectItem value="axis">Axis Bank</SelectItem>
                      <SelectItem value="pnb">Punjab National Bank</SelectItem>
                      <SelectItem value="boi">Bank of India</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Transaction Type */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">
                    Transaction Type *
                  </Label>
                  <Select
                    value={transactionType}
                    onValueChange={setTransactionType}
                    required
                  >
                    <SelectTrigger className="paybazaar-input">
                      <SelectValue placeholder="Select Transaction Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash-withdrawal">
                        💵 Cash Withdrawal
                      </SelectItem>
                      <SelectItem value="balance-enquiry">
                        📊 Balance Enquiry
                      </SelectItem>
                      <SelectItem value="mini-statement">
                        📑 Mini Statement
                      </SelectItem>
                      <SelectItem value="aadhaar-pay">🪪 Aadhaar Pay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount Field (conditional) */}
                {showAmountField && (
                  <div className="space-y-2">
                    <Label
                      htmlFor="amount"
                      className="text-sm font-semibold text-foreground"
                    >
                      Amount *
                    </Label>
                    <div className="relative">
                      <Banknote className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="amount"
                        type="number"
                        placeholder="Enter Amount"
                        className="paybazaar-input pl-10"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Device Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-foreground">
                    Select Device *
                  </Label>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div
                      onClick={() => setSelectedDevice("mantra")}
                      className={`cursor-pointer flex items-center space-x-3 p-4 rounded-xl border-2 transition 
                        ${
                          selectedDevice === "mantra"
                            ? "border-primary bg-primary/5"
                            : "border-muted"
                        }
                      `}
                    >
                      <Smartphone className="h-6 w-6 text-primary" />
                      <span className="font-medium">Mantra Device</span>
                    </div>
                    <div
                      onClick={() => setSelectedDevice("morpho")}
                      className={`cursor-pointer flex items-center space-x-3 p-4 rounded-xl border-2 transition 
                        ${
                          selectedDevice === "morpho"
                            ? "border-primary bg-primary/5"
                            : "border-muted"
                        }
                      `}
                    >
                      <CreditCard className="h-6 w-6 text-primary" />
                      <span className="font-medium">Morpho Device</span>
                    </div>
                  </div>
                </div>

                {/* Terms & Conditions */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="terms"
                    checked={acceptTerms}
                    onCheckedChange={(checked) =>
                      setAcceptTerms(checked as boolean)
                    }
                  />
                  <Label
                    htmlFor="terms"
                    className="text-sm text-primary cursor-pointer"
                  >
                    Accept Terms & Conditions
                  </Label>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full paybazaar-gradient text-white font-semibold py-4 text-lg rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
                  disabled={!acceptTerms}
                >
                  Submit
                </Button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
