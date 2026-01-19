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
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log("KYC form submitted");
  };

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
              <h1 className="text-2xl font-bold">Remitter Login</h1>
            </div>
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

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full paybazaar-gradient text-white font-medium py-3 rounded-md hover:opacity-90 transition-opacity"
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
