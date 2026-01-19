import { useState } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle2,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface DocumentFile {
  file: File | null;
  preview: string | null;
  uploaded: boolean;
}

const MyDocuments = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [aadharFront, setAadharFront] = useState<DocumentFile>({
    file: null,
    preview: null,
    uploaded: false,
  });
  const [aadharBack, setAadharBack] = useState<DocumentFile>({
    file: null,
    preview: null,
    uploaded: false,
  });
  const [panCard, setPanCard] = useState<DocumentFile>({
    file: null,
    preview: null,
    uploaded: false,
  });

  const [isUploading, setIsUploading] = useState(false);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setDocument: React.Dispatch<React.SetStateAction<DocumentFile>>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload only JPG, PNG, or PDF files",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocument({
          file,
          preview: reader.result as string,
          uploaded: false,
        });
      };
      reader.readAsDataURL(file);
    } else {
      setDocument({
        file,
        preview: null,
        uploaded: false,
      });
    }
  };

  const handleRemoveFile = (
    setDocument: React.Dispatch<React.SetStateAction<DocumentFile>>
  ) => {
    setDocument({
      file: null,
      preview: null,
      uploaded: false,
    });
  };

  const handleUpload = async () => {
    // Validate that at least one document is selected
    if (!aadharFront.file && !aadharBack.file && !panCard.file) {
      toast({
        title: "No Documents Selected",
        description: "Please select at least one document to upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Simulate API call - Replace with actual upload logic
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mark uploaded documents
      if (aadharFront.file) {
        setAadharFront((prev) => ({ ...prev, uploaded: true }));
      }
      if (aadharBack.file) {
        setAadharBack((prev) => ({ ...prev, uploaded: true }));
      }
      if (panCard.file) {
        setPanCard((prev) => ({ ...prev, uploaded: true }));
      }

      toast({
        title: "Success",
        description: "Documents uploaded successfully",
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload documents. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const DocumentUploadCard = ({
    title,
    document,
    setDocument,
    id,
  }: {
    title: string;
    document: DocumentFile;
    setDocument: React.Dispatch<React.SetStateAction<DocumentFile>>;
    id: string;
  }) => (
    <motion.div variants={cardVariants}>
      <Card className="overflow-hidden rounded-2xl border border-border/60 shadow-xl">
        <CardHeader className="paybazaar-gradient rounded-none border-b border-border/40 text-white">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <FileText className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Label htmlFor={id} className="text-sm font-medium text-slate-700">
              Upload Document
            </Label>

            {!document.file ? (
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <label
                  htmlFor={id}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-8 transition-all duration-200 hover:border-primary hover:bg-slate-50"
                >
                  <Upload className="mb-3 h-12 w-12 text-slate-400" />
                  <span className="mb-1 text-sm font-semibold text-slate-700">
                    Click to upload
                  </span>
                  <span className="text-xs text-slate-500">
                    JPG, PNG or PDF (max. 5MB)
                  </span>
                </label>
                <Input
                  id={id}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,application/pdf"
                  onChange={(e) => handleFileChange(e, setDocument)}
                  className="hidden"
                />
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="relative rounded-xl border-2 border-slate-200 bg-white p-4"
              >
                {document.preview ? (
                  <div className="relative">
                    <img
                      src={document.preview}
                      alt="Document preview"
                      className="h-48 w-full rounded-lg object-cover"
                    />
                    {document.uploaded && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute right-2 top-2 rounded-full bg-green-500 p-1"
                      >
                        <CheckCircle2 className="h-5 w-5 text-white" />
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center rounded-lg bg-slate-50 p-8">
                    <div className="text-center">
                      <ImageIcon className="mx-auto mb-2 h-12 w-12 text-slate-400" />
                      <p className="text-sm font-medium text-slate-700">
                        {document.file.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {(document.file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    {document.uploaded && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute right-2 top-2 rounded-full bg-green-500 p-1"
                      >
                        <CheckCircle2 className="h-5 w-5 text-white" />
                      </motion.div>
                    )}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {document.uploaded ? (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 text-green-600"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-sm font-medium">Uploaded</span>
                      </motion.div>
                    ) : (
                      <span className="text-sm font-medium text-slate-700">
                        Ready to upload
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFile(setDocument)}
                    className="h-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header  />
        <div className="flex-1 bg-muted/10">
          {/* Header */}
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="paybazaar-gradient text-white p-4 border-b"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(-1)}
                  className="text-white hover:bg-slate-700"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold">My Documents</h1>
                  <p className="text-sm text-white/80 mt-1">
                    Upload your identity documents for verification
                  </p>
                </div>
              </div>
            </div>
          </motion.header>

          {/* Main Content */}
          <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-6">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* Aadhar Front */}
              <DocumentUploadCard
                title="Aadhar Card (Front)"
                document={aadharFront}
                setDocument={setAadharFront}
                id="aadhar-front"
              />

              {/* Aadhar Back */}
              <DocumentUploadCard
                title="Aadhar Card (Back)"
                document={aadharBack}
                setDocument={setAadharBack}
                id="aadhar-back"
              />

              {/* PAN Card */}
              <motion.div variants={cardVariants} className="lg:col-span-2">
                <DocumentUploadCard
                  title="PAN Card (Front)"
                  document={panCard}
                  setDocument={setPanCard}
                  id="pan-card"
                />
              </motion.div>
            </motion.div>

            {/* Upload Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="flex justify-center"
            >
              <Button
                onClick={handleUpload}
                disabled={
                  isUploading ||
                  (!aadharFront.file && !aadharBack.file && !panCard.file) ||
                  (aadharFront.uploaded && aadharBack.uploaded && panCard.uploaded)
                }
                size="lg"
                className="paybazaar-gradient min-w-[200px] text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {isUploading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="mr-2"
                    >
                      <Upload className="h-5 w-5" />
                    </motion.div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-5 w-5" />
                    Upload Documents
                  </>
                )}
              </Button>
            </motion.div>

            {/* Info Card */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <Card className="overflow-hidden rounded-2xl border border-border/60 shadow-xl">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-slate-700">
                      Document Requirements
                    </h3>
                    <ul className="space-y-2 text-sm text-slate-600">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                        <span>Upload clear, legible images of your documents</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                        <span>
                          Accepted formats: JPG, PNG, or PDF (maximum 5MB per file)
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                        <span>
                          Ensure all details are clearly visible without any blur
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                        <span>
                          Documents will be verified within 24-48 hours
                        </span>
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default MyDocuments;