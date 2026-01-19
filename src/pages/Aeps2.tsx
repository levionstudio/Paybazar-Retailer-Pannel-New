import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Smartphone, CreditCard } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function AepsKyc() {
  const [selectedDevice, setSelectedDevice] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log("KYC form submitted");
  };

  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex w-full">
      <AppSidebar />


      <div className="flex-1 flex flex-col min-w-0">
        <Header />


        <main className="flex-1 p-6 space-y-6 overflow-auto">
          {/* Header Section with Gradient */}
          <div className="paybazaar-gradient rounded-lg p-6 text-white">
            <div className="flex items-center space-x-4 mb-4">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/services")}
                className="text-white hover:bg-slate-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold">AEPS Agent Daily KYC</h1>
            </div>
            <p className="text-white/90">
              Complete your daily KYC verification for AEPS services.
            </p>
          </div>

          {/* Form Card */}
          <div className="max-w-2xl mx-auto">
            <div className="paybazaar-card p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Mobile Number */}
                <div className="space-y-2">
                  <Label
                    htmlFor="mobile"
                    className="text-sm font-medium text-foreground"
                  >
                    Mobile Number *
                  </Label>
                  <Input
                    id="mobile"
                    type="tel"
                    placeholder="Enter Mobile Number"
                    className="paybazaar-input"
                    required
                  />
                </div>

                {/* Aadhaar Number */}
                <div className="space-y-2">
                  <Label
                    htmlFor="aadhaar"
                    className="text-sm font-medium text-foreground"
                  >
                    Aadhar Number *
                  </Label>
                  <Input
                    id="aadhaar"
                    type="text"
                    placeholder="Enter Aadhar Number"
                    className="paybazaar-input"
                    maxLength={12}
                    required
                  />
                </div>

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

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full paybazaar-gradient text-white font-medium py-3 rounded-md hover:opacity-90 transition-opacity"
                  disabled={!selectedDevice}
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
