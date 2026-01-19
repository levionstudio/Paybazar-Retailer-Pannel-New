import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  IdCard,
  KeyRound,
  Phone,
  Plus,
  Eye,
  Printer,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { AddBeneficiaryDialog } from "@/components/dialogs/AddBeneficiaryDialog";

export default function Dmt2() {
  const [step, setStep] = useState(1); // 1=mobile, 2=mobile otp, 3=aadhaar, 4=aadhaar otp, 5=remitter info
  const [mobile, setMobile] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [username, setUsername] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [showAddBeneficiary, setShowAddBeneficiary] = useState(false);

  const handleMobileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mobile.length !== 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }
    setError("");
    setStep(2); // go to mobile OTP form
  };

  const handleMobileOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp !== "123456") {
      setError("Invalid OTP for mobile verification. Please try again.");
      return;
    }
    setError("");
    setOtp("");
    setStep(3); // go to Aadhaar form
  };

  const handleAadhaarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (aadhaar.length !== 12) {
      setError("Please enter a valid 12-digit Aadhaar number");
      return;
    }
    setError("");
    setStep(4); // go to Aadhaar OTP form
  };

  const handleAadhaarOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp !== "654321") {
      setError("Invalid OTP for Aadhaar verification. Please try again.");
      return;
    }
    setError("");
    setStep(5); // go to Remitter Information
  };

  return (
    <div className="min-h-screen bg-background flex w-full">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0">


        <main className="flex-1 p-6 space-y-8 overflow-auto">
          {/* Header Section */}
          <div className="paybazaar-gradient rounded-xl p-6 text-white shadow-md">
            <div className="flex items-center space-x-3 mb-2">
              <Link
                to="/"
                className="text-white/90 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-2xl font-bold">Remitter Information</h1>
            </div>
            <p className="text-white/80 text-sm max-w-2xl leading-relaxed">
              Manage your remitter information and beneficiaries for secure
              transactions.
            </p>
          </div>

          {/* Form Card or Remitter Info */}
          <div className="max-w-6xl mx-auto">
            {step !== 5 && (
              <div className="paybazaar-card p-10 rounded-2xl shadow-xl hover:shadow-2xl transition-shadow">
                {step === 1 && (
                  <form onSubmit={handleMobileSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="mobile" className="text-sm font-semibold">
                        Mobile number *
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="mobile"
                          type="text"
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value)}
                          placeholder="Enter mobile number"
                          className="paybazaar-input pl-10"
                          maxLength={10}
                          required
                        />
                      </div>
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <Button type="submit" className="w-full paybazaar-gradient">
                      Send OTP
                    </Button>
                  </form>
                )}

                {step === 2 && (
                  <form onSubmit={handleMobileOtpSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label
                        htmlFor="mobileOtp"
                        className="text-sm font-semibold"
                      >
                        Enter OTP sent to {mobile}
                      </Label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="mobileOtp"
                          type="text"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          placeholder="Enter OTP"
                          className="paybazaar-input pl-10"
                          maxLength={6}
                          required
                        />
                      </div>
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <Button type="submit" className="w-full paybazaar-gradient">
                      Verify OTP
                    </Button>
                  </form>
                )}

                {step === 3 && (
                  <form onSubmit={handleAadhaarSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-semibold">
                        First name *
                      </Label>
                      <div className="relative">
                        <IdCard className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="name"
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="First name"
                          className="paybazaar-input pl-10"
                          maxLength={12}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="aadhaar"
                        className="text-sm font-semibold"
                      >
                        Aadhaar Number *
                      </Label>
                      <div className="relative">
                        <IdCard className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="aadhaar"
                          type="text"
                          value={aadhaar}
                          onChange={(e) => setAadhaar(e.target.value)}
                          placeholder="Enter Aadhaar number"
                          className="paybazaar-input pl-10"
                          maxLength={12}
                          required
                        />
                      </div>
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <Button type="submit" className="w-full paybazaar-gradient">
                      Send OTP
                    </Button>
                  </form>
                )}

                {step === 4 && (
                  <form onSubmit={handleAadhaarOtpSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label
                        htmlFor="aadhaarOtp"
                        className="text-sm font-semibold"
                      >
                        Enter OTP sent for Aadhaar verification
                      </Label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="aadhaarOtp"
                          type="text"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          placeholder="Enter OTP"
                          className="paybazaar-input pl-10"
                          maxLength={6}
                          required
                        />
                      </div>
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <Button type="submit" className="w-full paybazaar-gradient">
                      Verify OTP
                    </Button>
                  </form>
                )}
              </div>
            )}

            {/* Step 5 - Remitter Information */}
            {step === 5 && (
              <div className="space-y-6">
                {/* Remitter Information Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-card p-4 rounded-lg border border-border shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-orange-100 rounded-full">
                        <span className="text-orange-600 text-xl">👤</span>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-semibold">Anikethan Shetty</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-card p-4 rounded-lg border border-border shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gray-100 rounded-full">
                        <Phone className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Mobile Number
                        </p>
                        <p className="font-semibold">
                          {mobile || "9019542363"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-card p-4 rounded-lg border border-border shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-yellow-100 rounded-full">
                        <span className="text-yellow-600 text-xl">💰</span>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Your Limit
                        </p>
                        <p className="font-semibold">Limit: ₹ 50000</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-card p-4 rounded-lg border border-border shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-full">
                        <span className="text-blue-600 text-xl">📊</span>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Used</p>
                        <p className="font-semibold">Used: ₹ 0</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Add Beneficiary Button */}
                <div className="flex justify-end">
                  <Button
                    onClick={() => setShowAddBeneficiary(true)}
                    className="bg-slate-800 hover:bg-slate-900 text-white flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Bene
                  </Button>
                </div>

                {/* Beneficiaries Table */}
                <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-800 text-white">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium">
                            BENEFICIARYNAME
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium">
                            BANKNAME
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium">
                            IFSC
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium">
                            ACCOUNTNUMBER
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium">
                            BENEMOBILE
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium">
                            PAY
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium">
                            VERIFY
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium">
                            DELETE
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td
                            colSpan={8}
                            className="px-4 py-8 text-center text-muted-foreground"
                          >
                            No data available in table
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-t">
                    <div className="text-sm text-muted-foreground">
                      Showing 0 to 0 of 0 entries
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="bg-gray-200 text-gray-400"
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="bg-gray-200 text-gray-400"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Add Beneficiary Dialog */}
      <AddBeneficiaryDialog
        open={showAddBeneficiary}
        onOpenChange={setShowAddBeneficiary}
      />
    </div>
  );
}
