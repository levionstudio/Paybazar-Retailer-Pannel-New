import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Lock, Key, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function ChangePassword() {
  const [showPassword, setShowPassword] = useState({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false,
    oldMpin: false,
    newMpin: false,
    confirmMpin: false,
  });

  const [formData, setFormData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
    oldMpin: "",
    newMpin: "",
    confirmMpin: "",
  });

  const { toast } = useToast();
  const navigate = useNavigate();

  const togglePasswordVisibility = (field: keyof typeof showPassword) => {
    setShowPassword((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "New password and confirm password do not match",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Success",
      description: "Password changed successfully",
    });
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newMpin !== formData.confirmMpin) {
      toast({
        title: "Error",
        description: "New MPIN and confirm MPIN do not match",
        variant: "destructive",
      });
      return;
    }
    if (formData.newMpin.length !== 4) {
      toast({
        title: "Error",
        description: "MPIN must be 4 digits",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Success",
      description: "MPIN changed successfully",
    });
  };

  return (
    <div className="min-h-screen bg-background flex w-full">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main className="flex-1 p-6 space-y-8 overflow-auto">
          {/* Header Section */}
          <div className="paybazaar-gradient rounded-xl p-6 text-white shadow-md">
            <div className="flex items-center space-x-3 mb-2">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="text-white hover:bg-slate-700 hover:text-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold">Change Password</h1>
            </div>
            <p className="text-white/80 text-sm max-w-2xl leading-relaxed">
              Update your login credentials and security PIN for enhanced
              account protection.
            </p>
          </div>

          {/* Forms Container */}
          <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Change Password Card */}
            <Card className="shadow-lg border-0 bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Lock className="h-5 w-5 text-primary" />
                  Change Password
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="oldPassword"
                      className="text-sm font-semibold"
                    >
                      Old Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="oldPassword"
                        type={showPassword.oldPassword ? "text" : "password"}
                        value={formData.oldPassword}
                        onChange={(e) =>
                          handleInputChange("oldPassword", e.target.value)
                        }
                        placeholder="Enter current password"
                        className="pl-10 pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => togglePasswordVisibility("oldPassword")}
                      >
                        {showPassword.oldPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="newPassword"
                      className="text-sm font-semibold"
                    >
                      New Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="newPassword"
                        type={showPassword.newPassword ? "text" : "password"}
                        value={formData.newPassword}
                        onChange={(e) =>
                          handleInputChange("newPassword", e.target.value)
                        }
                        placeholder="Enter new password"
                        className="pl-10 pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => togglePasswordVisibility("newPassword")}
                      >
                        {showPassword.newPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="confirmPassword"
                      className="text-sm font-semibold"
                    >
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type={
                          showPassword.confirmPassword ? "text" : "password"
                        }
                        value={formData.confirmPassword}
                        onChange={(e) =>
                          handleInputChange("confirmPassword", e.target.value)
                        }
                        placeholder="Confirm new password"
                        className="pl-10 pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() =>
                          togglePasswordVisibility("confirmPassword")
                        }
                      >
                        {showPassword.confirmPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full paybazaar-gradient font-semibold"
                  >
                    Change Password
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Change PIN Card */}
            <Card className="shadow-lg border-0 bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Key className="h-5 w-5 text-primary" />
                  Change PIN
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePinSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="oldMpin" className="text-sm font-semibold">
                      Old MPIN
                    </Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="oldMpin"
                        type={showPassword.oldMpin ? "text" : "password"}
                        value={formData.oldMpin}
                        onChange={(e) =>
                          handleInputChange("oldMpin", e.target.value)
                        }
                        placeholder="Enter current MPIN"
                        className="pl-10 pr-10"
                        maxLength={4}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => togglePasswordVisibility("oldMpin")}
                      >
                        {showPassword.oldMpin ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newMpin" className="text-sm font-semibold">
                      New MPIN
                    </Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="newMpin"
                        type={showPassword.newMpin ? "text" : "password"}
                        value={formData.newMpin}
                        onChange={(e) =>
                          handleInputChange("newMpin", e.target.value)
                        }
                        placeholder="Enter new MPIN"
                        className="pl-10 pr-10"
                        maxLength={4}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => togglePasswordVisibility("newMpin")}
                      >
                        {showPassword.newMpin ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="confirmMpin"
                      className="text-sm font-semibold"
                    >
                      Confirm MPIN
                    </Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirmMpin"
                        type={showPassword.confirmMpin ? "text" : "password"}
                        value={formData.confirmMpin}
                        onChange={(e) =>
                          handleInputChange("confirmMpin", e.target.value)
                        }
                        placeholder="Confirm new MPIN"
                        className="pl-10 pr-10"
                        maxLength={4}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => togglePasswordVisibility("confirmMpin")}
                      >
                        {showPassword.confirmMpin ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full paybazaar-gradient font-semibold"
                  >
                    Change PIN
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
   