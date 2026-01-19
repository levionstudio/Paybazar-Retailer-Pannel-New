import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Shield } from "lucide-react";
import axios from "axios";
import { jwtDecode, JwtPayload } from "jwt-decode";

const ChangePasswordMpin = () => {
  const { toast } = useToast();
  const [id, setId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // MPIN form state
  const [mpinForm, setMpinForm] = useState({
    oldMpin: "",
    newMpin: "",
    confirmMpin: "",
  });
  const [showOldMpin, setShowOldMpin] = useState(false);
  const [showNewMpin, setShowNewMpin] = useState(false);
  const [showConfirmMpin, setShowConfirmMpin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    try {
      const decoded: JwtPayload = jwtDecode(token);
      //@ts-ignore
      setId(decoded.data.user_id);
    } catch (error) {
      console.error("Error decoding JWT:", error);
    }
  }, []);

  // Handle MPIN Change
  const handleMpinChange = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (mpinForm.newMpin !== mpinForm.confirmMpin) {
      toast({
        title: "Error",
        description: "New MPIN and confirm MPIN do not match",
        variant: "destructive",
      });
      return;
    }

    if (mpinForm.newMpin.length !== 4 || !/^\d+$/.test(mpinForm.newMpin)) {
      toast({
        title: "Error",
        description: "MPIN must be exactly 4 digits",
        variant: "destructive",
      });
      return;
    }

    if (mpinForm.oldMpin === mpinForm.newMpin) {
      toast({
        title: "Error",
        description: "New MPIN must be different from old MPIN",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Verify old MPIN
      const verifyResponse = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/user/verify/mpin`,
        {
          mpin: mpinForm.oldMpin,
          user_id: id,
        }
      );

      if (verifyResponse.status === 200) {
        // Set new MPIN
        const setResponse = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/user/set/mpin`,
          {
            mpin: mpinForm.newMpin,
            user_id: id,
          }
        );

        if (setResponse.status === 200) {
          toast({
            title: "Success",
            description: "MPIN changed successfully",
          });

          // Reset form
          setMpinForm({
            oldMpin: "",
            newMpin: "",
            confirmMpin: "",
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.response?.data?.message ||
          "Failed to change MPIN. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-2xl mx-auto space-y-8">
            {/* Page Header */}
            
            {/* MPIN Change Card */}
            <Card className="shadow-lg border-border/50">
              <CardHeader className="paybazaar-gradient text-white rounded-t-xl space-y-1 pb-6">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Shield className="w-5 h-5" />
                  Change MPIN
                </CardTitle>
                <p className="text-sm text-white/90">
                  Enter your current MPIN and create a new 4-digit MPIN
                </p>
              </CardHeader>

              <CardContent className="pt-6 pb-8 px-6">
                <form onSubmit={handleMpinChange} className="space-y-6">
                  {/* Old MPIN */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="oldMpin"
                      className="text-sm font-medium text-foreground"
                    >
                      Current MPIN <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="oldMpin"
                        type={showOldMpin ? "text" : "password"}
                        placeholder="••••"
                        value={mpinForm.oldMpin}
                        onChange={(e) =>
                          setMpinForm({
                            ...mpinForm,
                            oldMpin: e.target.value.replace(/\D/g, ""),
                          })
                        }
                        maxLength={4}
                        inputMode="numeric"
                        required
                        disabled={isLoading}
                        className="h-12 text-center tracking-[0.5em] text-lg font-semibold pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldMpin(!showOldMpin)}
                        disabled={isLoading}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                      >
                        {showOldMpin ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        New MPIN
                      </span>
                    </div>
                  </div>

                  {/* New MPIN */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="newMpin"
                      className="text-sm font-medium text-foreground"
                    >
                      New MPIN <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="newMpin"
                        type={showNewMpin ? "text" : "password"}
                        placeholder="••••"
                        value={mpinForm.newMpin}
                        onChange={(e) =>
                          setMpinForm({
                            ...mpinForm,
                            newMpin: e.target.value.replace(/\D/g, ""),
                          })
                        }
                        maxLength={4}
                        inputMode="numeric"
                        required
                        disabled={isLoading}
                        className="h-12 text-center tracking-[0.5em] text-lg font-semibold pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewMpin(!showNewMpin)}
                        disabled={isLoading}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                      >
                        {showNewMpin ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm MPIN */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="confirmMpin"
                      className="text-sm font-medium text-foreground"
                    >
                      Confirm New MPIN <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmMpin"
                        type={showConfirmMpin ? "text" : "password"}
                        placeholder="••••"
                        value={mpinForm.confirmMpin}
                        onChange={(e) =>
                          setMpinForm({
                            ...mpinForm,
                            confirmMpin: e.target.value.replace(/\D/g, ""),
                          })
                        }
                        maxLength={4}
                        inputMode="numeric"
                        required
                        disabled={isLoading}
                        className="h-12 text-center tracking-[0.5em] text-lg font-semibold pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmMpin(!showConfirmMpin)}
                        disabled={isLoading}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                      >
                        {showConfirmMpin ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Security Tips */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      Security Tips:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Use a unique 4-digit combination</li>
                      <li>Avoid using sequential numbers (e.g., 1234)</li>
                      <li>Don't share your MPIN with anyone</li>
                    </ul>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isLoading}
                    className="w-full paybazaar-gradient text-white hover:opacity-90 transition-opacity h-12 text-base font-medium"
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
                        Updating MPIN...
                      </span>
                    ) : (
                      "Update MPIN"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordMpin;