import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Camera,
  Save,
  Upload,
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Building2,
  CheckCircle,
  Lock,
  AlertCircle,
  Clock,
  Unlock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { motion } from "framer-motion";


interface DecodedToken {
  user_id: string;
  user_role: string;
  exp: number;
}

type SectionType = "personal" | "contact" | "address" | "kyc";

interface SectionPermission {
  section: SectionType;
  status: "none" | "pending" | "approved" | "rejected";
  requestDate?: string;
}

export default function ProfileUpdate() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    user_name: "",
    user_email: "",
    user_phone: "",
    user_aadhar_number: "",
    user_pan_number: "",
    user_city: "",
    user_state: "",
    user_address: "",
    user_pincode: "",
    user_date_of_birth: "",
    user_gender: "",
  });

  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const [profileImage, setProfileImage] = useState(
    "/lovable-uploads/c0876286-fbc5-4e25-b7e8-cb81e868b3fe.png"
  );
  const [isUploading, setIsUploading] = useState(false);

  // Section-based permission states
  const [sectionPermissions, setSectionPermissions] = useState<SectionPermission[]>([
    { section: "personal", status: "none" },
    { section: "contact", status: "none" },
    { section: "address", status: "none" },
    { section: "kyc", status: "none" },
  ]);

  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [selectedSection, setSelectedSection] = useState<SectionType | "">("");
  const [permissionReason, setPermissionReason] = useState("");
  const [requestingPermission, setRequestingPermission] = useState(false);

  const sectionOptions = [
    {
      value: "personal",
      label: "Personal Details",
      description: "Name, Gender, Date of Birth",
      icon: User,
      defaultReason: "I need to update my personal details like name, gender, or date of birth due to incorrect information.",
    },
    {
      value: "contact",
      label: "Contact Information",
      description: "Email, Phone Number",
      icon: Phone,
      defaultReason: "I need to update my contact information like phone number or email address because my details have changed.",
    },
    {
      value: "address",
      label: "Address Details",
      description: "Address, City, State, Pincode",
      icon: MapPin,
      defaultReason: "I need to update my address details because I have relocated to a new location or the address is incorrect.",
    },
    {
      value: "kyc",
      label: "KYC Details",
      description: "Aadhaar Number, PAN Number",
      icon: CreditCard,
      defaultReason: "I need to update my KYC documents like Aadhaar or PAN number due to incorrect or outdated information.",
    },
  ];

  // Get user_id from token and fetch profile
  useEffect(() => {
    const checkPermissionAndFetchProfile = async (userId: string) => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please log in to view your profile.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      try {
        setFetchingProfile(true);

        // TODO: Replace with actual API call to check section permissions
        // const permissionResponse = await axios.get(
        //   `${import.meta.env.VITE_API_BASE_URL}/user/profile-section-permissions/${userId}`,
        //   {
        //     headers: {
        //       Authorization: `Bearer ${token}`,
        //       "Content-Type": "application/json",
        //     },
        //   }
        // );

        // For testing: Simulate section permissions
        // Change status to "approved" to unlock that section
        const mockPermissions: SectionPermission[] = [
          { section: "personal", status: "none" },
          { section: "contact", status: "none" },
          { section: "address", status: "none" },
          { section: "kyc", status: "none" },
        ];
        setSectionPermissions(mockPermissions);

        // Fetch profile data
        const response = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}retailer/get/retailer/${userId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.data.status === "success" && response.data.data?.user) {
          const userData = response.data.data.user;

          setFormData({
            user_name: userData.user_name || "",
            user_email: userData.user_email || "",
            user_phone: userData.user_phone || "",
            user_aadhar_number: userData.user_aadhar_number || "",
            user_pan_number: userData.user_pan_number || "",
            user_city: userData.user_city || "",
            user_state: userData.user_state || "",
            user_address: userData.user_address || "",
            user_pincode: userData.user_pincode || "",
            user_date_of_birth: userData.user_date_of_birth || "",
            user_gender: userData.user_gender || "",
          });

          toast({
            title: "Profile Loaded",
            description: "Your profile information has been loaded successfully.",
          });
        }
      } catch (error: any) {
        console.error("Error fetching profile:", error);

        let errorMessage = "Failed to load profile data.";

        if (error.response?.status === 401) {
          errorMessage = "Session expired. Please log in again.";
          setTimeout(() => navigate("/login"), 2000);
        } else if (error.response?.status === 404) {
          errorMessage = "Profile not found.";
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }

        toast({
          title: "Warning",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setFetchingProfile(false);
      }
    };

    const token = localStorage.getItem("authToken");
    if (token) {
      try {
        const decoded: DecodedToken = jwtDecode(token);
        if (decoded.user_id) {
          const userIdFromToken = decoded.user_id;
          setUserId(userIdFromToken);
          checkPermissionAndFetchProfile(userIdFromToken);
        } else {
          toast({
            title: "Error",
            description: "User ID not found in token. Please log in again.",
            variant: "destructive",
          });
          navigate("/login");
        }
      } catch (error) {
        console.error("Error decoding token:", error);
        toast({
          title: "Error",
          description: "Failed to load user information. Please log in again.",
          variant: "destructive",
        });
        navigate("/login");
      }
    } else {
      toast({
        title: "Authentication Required",
        description: "Please log in to update your profile.",
        variant: "destructive",
      });
      navigate("/login");
    }
  }, [navigate, toast]);

  const getSectionStatus = (section: SectionType) => {
    return sectionPermissions.find((p) => p.section === section)?.status || "none";
  };

  const isSectionEditable = (section: SectionType) => {
    return getSectionStatus(section) === "approved";
  };

  const handleRequestPermission = async () => {
    if (!selectedSection) {
      toast({
        title: "Section Required",
        description: "Please select which section you want to edit.",
        variant: "destructive",
      });
      return;
    }

    if (!permissionReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for update request.",
        variant: "destructive",
      });
      return;
    }

    const token = localStorage.getItem("authToken");
    if (!token) {
      toast({
        title: "Authentication Required",
        description: "Please log in to request permission.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    try {
      setRequestingPermission(true);

      // TODO: Replace with actual API call
      // const response = await axios.post(
      //   `${import.meta.env.VITE_API_BASE_URL}/user/request-section-update`,
      //   {
      //     user_id: userId,
      //     section: selectedSection,
      //     reason: permissionReason,
      //   },
      //   {
      //     headers: {
      //       Authorization: `Bearer ${token}`,
      //       "Content-Type": "application/json",
      //     },
      //   }
      // );

      // For testing: Simulate successful request
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update section permission status
      setSectionPermissions((prev) =>
        prev.map((p) =>
          p.section === selectedSection
            ? { ...p, status: "pending", requestDate: new Date().toISOString() }
            : p
        )
      );

      setShowPermissionDialog(false);
      setSelectedSection("");
      setPermissionReason("");

      const sectionName = sectionOptions.find((s) => s.value === selectedSection)?.label;

      toast({
        title: "Request Submitted",
        description: `Your request to edit ${sectionName} has been sent to admin for approval.`,
      });
    } catch (error: any) {
      console.error("Permission request error:", error);

      let errorMessage = "Failed to submit permission request. Please try again.";

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      toast({
        title: "Request Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setRequestingPermission(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      setTimeout(() => {
        const imageUrl = URL.createObjectURL(file);
        setProfileImage(imageUrl);
        setIsUploading(false);
        toast({
          title: "Profile photo updated",
          description: "Your profile photo has been successfully updated.",
        });
      }, 1500);
    }
  };

  const formatDateForAPI = (dateString: string): string => {
    if (!dateString) return "";
    if (dateString.includes("-") && dateString.split("-")[0].length === 2) {
      return dateString;
    }
    const [year, month, day] = dateString.split("-");
    return `${day}-${month}-${year}`;
  };

  const formatDateForInput = (dateString: string): string => {
    if (!dateString) return "";
    if (dateString.includes("-") && dateString.split("-")[0].length === 4) {
      return dateString;
    }
    const [day, month, year] = dateString.split("-");
    return `${year}-${month}-${day}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      toast({
        title: "Error",
        description: "User ID not found. Please log in again.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    // Check if at least one section is editable
    const hasEditableSection = sectionPermissions.some((p) => p.status === "approved");
    if (!hasEditableSection) {
      toast({
        title: "Permission Required",
        description: "You need admin approval to update your profile.",
        variant: "destructive",
      });
      return;
    }

    const token = localStorage.getItem("authToken");
    if (!token) {
      toast({
        title: "Authentication Required",
        description: "Please log in to update your profile.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    const payload = {
      user_id: userId,
      user_name: formData.user_name,
      user_email: formData.user_email,
      user_phone: formData.user_phone,
      user_aadhar_number: formData.user_aadhar_number,
      user_pan_number: formData.user_pan_number,
      user_city: formData.user_city,
      user_state: formData.user_state,
      user_address: formData.user_address,
      user_pincode: formData.user_pincode,
      user_date_of_birth: formatDateForAPI(formData.user_date_of_birth),
      user_gender: formData.user_gender,
    };

    try {
      setLoading(true);

      toast({
        title: "Updating Profile",
        description: "Please wait while we update your profile...",
      });

      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/user/update/profile`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.status === "success") {
        toast({
          title: "Success",
          description: response.data.message || "Profile updated successfully!",
        });

        // Reset permissions for updated sections
        setSectionPermissions((prev) =>
          prev.map((p) => (p.status === "approved" ? { ...p, status: "none" } : p))
        );

        setTimeout(() => {
          navigate("/profile");
        }, 1500);
      } else {
        toast({
          title: "Update Failed",
          description:
            response.data.message || "Failed to update profile. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Profile update error:", error);

      let errorMessage = "Failed to update profile. Please try again.";

      if (error.response) {
        if (error.response.status === 400) {
          errorMessage =
            error.response.data?.message || "Invalid data. Please check all fields.";
        } else if (error.response.status === 401) {
          errorMessage = "Session expired. Please log in again.";
          setTimeout(() => navigate("/login"), 2000);
        } else if (error.response.status === 403) {
          errorMessage = "You don't have permission to perform this action.";
        } else if (error.response.status === 500) {
          errorMessage = "Server error. Please try again later.";
        } else {
          errorMessage = error.response.data?.message || errorMessage;
        }
      } else if (error.request) {
        errorMessage = "Network error. Please check your internet connection.";
      }

      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderSectionBadge = (section: SectionType) => {
    const status = getSectionStatus(section);

    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-50 text-green-700 border-green-200 ml-2">
            <Unlock className="h-3 w-3 mr-1" />
            Unlocked
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 ml-2">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200 ml-2">
            <AlertCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-50 text-slate-700 border-slate-200 ml-2">
            <Lock className="h-3 w-3 mr-1" />
            Locked
          </Badge>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex w-full">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main className="flex-1 p-6 space-y-6 overflow-auto">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between mb-6"
          >
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/profile")}
                className="hover:bg-accent"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Update Profile</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Request permission to edit specific sections
                </p>
              </div>
            </div>

            <Button
              onClick={() => setShowPermissionDialog(true)}
              className="paybazaar-gradient text-white"
            >
              <Lock className="h-4 w-4 mr-2" />
              Request Edit Permission
            </Button>
          </motion.div>

          {fetchingProfile ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-muted-foreground">Loading profile data...</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Profile Photo Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Card className="overflow-hidden rounded-2xl border border-border/60 shadow-xl">
                  <CardHeader className="paybazaar-gradient rounded-none border-b border-white/20 text-white">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Camera className="h-5 w-5" />
                      Profile Photo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="relative">
                        <Avatar className="h-32 w-32 ring-4 ring-primary/20">
                          <AvatarImage src={profileImage} alt="Profile" />
                          <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                            {formData.user_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>

                        {isUploading && (
                          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 text-center md:text-left">
                        <h3 className="text-lg font-semibold mb-2">
                          Upload Profile Picture
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          Choose a photo that represents you well. JPG, PNG files up to 5MB.
                        </p>

                        <div className="flex gap-3 flex-wrap justify-center md:justify-start">
                          <Button
                            type="button"
                            variant="outline"
                            className="relative overflow-hidden"
                            disabled={isUploading}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {isUploading ? "Uploading..." : "Choose Photo"}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              disabled={isUploading}
                            />
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setProfileImage("")}
                            disabled={isUploading}
                          >
                            Remove Photo
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Personal Information */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="overflow-hidden rounded-2xl border border-border/60 shadow-xl">
                  <CardHeader className="paybazaar-gradient rounded-none border-b border-white/20 text-white">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <User className="h-5 w-5" />
                      Personal Information
                      {renderSectionBadge("personal")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="user_name">Full Name *</Label>
                      <Input
                        id="user_name"
                        value={formData.user_name}
                        onChange={(e) => handleInputChange("user_name", e.target.value)}
                        className="mt-1"
                        required
                        placeholder="Enter your full name"
                        disabled={!isSectionEditable("personal")}
                      />
                    </div>

                    <div>
                      <Label htmlFor="user_gender">Gender</Label>
                      <Input
                        id="user_gender"
                        value={formData.user_gender}
                        onChange={(e) => handleInputChange("user_gender", e.target.value)}
                        className="mt-1"
                        placeholder="Male, Female, Other"
                        disabled={!isSectionEditable("personal")}
                      />
                    </div>

                    <div>
                      <Label htmlFor="user_date_of_birth">Date of Birth</Label>
                      <Input
                        id="user_date_of_birth"
                        type="date"
                        value={formatDateForInput(formData.user_date_of_birth)}
                        onChange={(e) => {
                          const formatted = formatDateForAPI(e.target.value);
                          handleInputChange("user_date_of_birth", formatted);
                        }}
                        className="mt-1"
                        disabled={!isSectionEditable("personal")}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Contact Information */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Card className="overflow-hidden rounded-2xl border border-border/60 shadow-xl">
                  <CardHeader className="paybazaar-gradient rounded-none border-b border-white/20 text-white">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Phone className="h-5 w-5" />
                      Contact Information
                      {renderSectionBadge("contact")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="user_email">Email Address *</Label>
                      <Input
                        id="user_email"
                        type="email"
                        value={formData.user_email}
                        onChange={(e) => handleInputChange("user_email", e.target.value)}
                        className="mt-1"
                        required
                        placeholder="Enter your email"
                        disabled={!isSectionEditable("contact")}
                      />
                    </div>

                    <div>
                      <Label htmlFor="user_phone">Mobile Number *</Label>
                      <Input
                        id="user_phone"
                        value={formData.user_phone}
                        onChange={(e) =>
                          handleInputChange(
                            "user_phone",
                            e.target.value.replace(/\D/g, "").slice(0, 10)
                          )
                        }
                        className="mt-1"
                        required
                        placeholder="Enter 10-digit mobile number"
                        maxLength={10}
                        disabled={!isSectionEditable("contact")}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Address Information */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Card className="overflow-hidden rounded-2xl border border-border/60 shadow-xl">
                  <CardHeader className="paybazaar-gradient rounded-none border-b border-white/20 text-white">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <MapPin className="h-5 w-5" />
                      Address Information
                      {renderSectionBadge("address")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <Label htmlFor="user_address">Complete Address *</Label>
                      <Textarea
                        id="user_address"
                        value={formData.user_address}
                        onChange={(e) => handleInputChange("user_address", e.target.value)}
                        className="mt-1"
                        rows={3}
                        required
                        placeholder="Enter your complete address"
                        disabled={!isSectionEditable("address")}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="user_city">City *</Label>
                        <Input
                          id="user_city"
                          value={formData.user_city}
                          onChange={(e) => handleInputChange("user_city", e.target.value)}
                          className="mt-1"
                          required
                          placeholder="Enter city"
                          disabled={!isSectionEditable("address")}
                        />
                      </div>

                      <div>
                        <Label htmlFor="user_state">State *</Label>
                        <Input
                          id="user_state"
                          value={formData.user_state}
                          onChange={(e) => handleInputChange("user_state", e.target.value)}
                          className="mt-1"
                          required
                          placeholder="Enter state"
                          disabled={!isSectionEditable("address")}
                        />
                      </div>

                      <div>
                        <Label htmlFor="user_pincode">Pin Code *</Label>
                        <Input
                          id="user_pincode"
                          value={formData.user_pincode}
                          onChange={(e) =>
                            handleInputChange(
                              "user_pincode",
                              e.target.value.replace(/\D/g, "").slice(0, 6)
                            )
                          }
                          className="mt-1"
                          required
                          placeholder="Enter pincode"
                          maxLength={6}
                          disabled={!isSectionEditable("address")}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Verification Documents */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <Card className="overflow-hidden rounded-2xl border border-border/60 shadow-xl">
                  <CardHeader className="paybazaar-gradient rounded-none border-b border-white/20 text-white">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <CreditCard className="h-5 w-5" />
                      KYC Documents
                      {renderSectionBadge("kyc")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="user_pan_number">PAN Number</Label>
                      <Input
                        id="user_pan_number"
                        value={formData.user_pan_number}
                        onChange={(e) =>
                          handleInputChange("user_pan_number", e.target.value.toUpperCase())
                        }
                        className="mt-1"
                        placeholder="Enter PAN number"
                        maxLength={10}
                        disabled={!isSectionEditable("kyc")}
                      />
                    </div>

                    <div>
                      <Label htmlFor="user_aadhar_number">Aadhaar Number</Label>
                      <Input
                        id="user_aadhar_number"
                        value={formData.user_aadhar_number}
                        onChange={(e) =>
                          handleInputChange(
                            "user_aadhar_number",
                            e.target.value.replace(/\D/g, "").slice(0, 12)
                          )
                        }
                        className="mt-1"
                        placeholder="Enter Aadhaar number"
                        maxLength={12}
                        disabled={!isSectionEditable("kyc")}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="flex flex-col sm:flex-row gap-4 justify-end"
              >
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/profile")}
                  className="sm:w-auto"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  className="sm:w-auto paybazaar-gradient text-white"
                  disabled={
                    isUploading ||
                    loading ||
                    !sectionPermissions.some((p) => p.status === "approved")
                  }
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </motion.div>
            </form>
          )}
        </main>
      </div>

      {/* Permission Request Dialog */}
      <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Request Section Edit Permission
            </DialogTitle>
            <DialogDescription>
              Select which section you want to edit and provide a reason. Admin will review
              and approve your request.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="section_select">Select Section to Edit *</Label>
              <Select 
                value={selectedSection} 
                onValueChange={(value: any) => {
                  setSelectedSection(value);
                  // Auto-fill reason based on selected section
                  const selectedOption = sectionOptions.find(opt => opt.value === value);
                  if (selectedOption) {
                    setPermissionReason(selectedOption.defaultReason);
                  }
                }}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Choose a section" />
                </SelectTrigger>
                <SelectContent>
                  {sectionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <option.icon className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {option.description}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="permission_reason">Reason for Update *</Label>
              <Textarea
                id="permission_reason"
                value={permissionReason}
                onChange={(e) => setPermissionReason(e.target.value)}
                placeholder="Reason will be filled automatically when you select a section"
                rows={4}
                className="mt-2"
                disabled={requestingPermission}
              />
              <p className="text-sm text-muted-foreground mt-2">
                ✓ Reason is pre-filled. You can edit if needed or submit directly.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowPermissionDialog(false);
                setSelectedSection("");
                setPermissionReason("");
              }}
              disabled={requestingPermission}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleRequestPermission}
              disabled={
                requestingPermission || !selectedSection || !permissionReason.trim()
              }
              className="paybazaar-gradient text-white"
            >
              {requestingPermission ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}