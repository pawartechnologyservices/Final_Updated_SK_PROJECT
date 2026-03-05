import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Upload, Trash2, Camera, X, Save, Edit, Download, Loader2, UserCheck, User } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import axios from "axios";

// Define the API Base URL
const API_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:5001/api' 
  : '/api';

// Types
interface Employee {
  _id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  aadharNumber: string;
  department: string;
  position: string;
  joinDate?: string;
  dateOfJoining?: string;
  status: "active" | "inactive" | "left";
  salary: number | string;
  uanNumber?: string;
  uan?: string;
  esicNumber?: string;
  panNumber?: string;
  photo?: string;
  // Additional fields
  siteName?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  gender?: string;
  maritalStatus?: string;
  permanentAddress?: string;
  permanentPincode?: string;
  localAddress?: string;
  localPincode?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  fatherName?: string;
  motherName?: string;
  spouseName?: string;
  numberOfChildren?: string | number;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  nomineeName?: string;
  nomineeRelation?: string;
  pantSize?: string;
  shirtSize?: string;
  capSize?: string;
  idCardIssued?: boolean;
  westcoatIssued?: boolean;
  apronIssued?: boolean;
  employeeSignature?: string;
  authorizedSignature?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface SalaryStructure {
  id: number;
  employeeId: string;
  basic: number;
  hra: number;
  da: number;
  conveyance: number;
  medical: number;
  specialAllowance: number;
  otherAllowances: number;
  pf: number;
  esic: number;
  professionalTax: number;
  tds: number;
  otherDeductions: number;
  workingDays: number;
  paidDays: number;
  lopDays: number;
}

interface NewEmployeeForm {
  // Basic Information
  name: string;
  email: string;
  phone: string;
  aadharNumber: string;
  panNumber: string;
  esicNumber: string;
  uanNumber: string;
  
  // Personal Details
  siteName: string;
  dateOfBirth: string;
  dateOfJoining: string;
  dateOfExit: string;
  bloodGroup: string;
  gender?: string;
  maritalStatus?: string;
  
  // Address
  permanentAddress: string;
  permanentPincode: string;
  localAddress: string;
  localPincode: string;
  
  // Bank Details
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  
  // Family Details
  fatherName: string;
  motherName: string;
  spouseName: string;
  numberOfChildren: string;
  
  // Emergency Contact
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  
  // Nominee Details
  nomineeName: string;
  nomineeRelation: string;
  
  // Uniform Details
  pantSize: string;
  shirtSize: string;
  capSize: string;
  
  // Issued Items
  idCardIssued: boolean;
  westcoatIssued: boolean;
  apronIssued: boolean;
  
  // Employment Details
  department: string;
  position: string;
  salary: string;
  
  // Documents
  photo: File | null;
  employeeSignature: File | null;
  authorizedSignature: File | null;
}

interface EPFForm11Data {
  memberName: string;
  fatherOrSpouseName: string;
  relationshipType: "father" | "spouse";
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  email: string;
  mobileNumber: string;
  
  previousEPFMember: boolean;
  previousPensionMember: boolean;
  
  previousUAN: string;
  previousPFAccountNumber: string;
  dateOfExit: string;
  schemeCertificateNumber: string;
  pensionPaymentOrder: string;
  
  internationalWorker: boolean;
  countryOfOrigin: string;
  passportNumber: string;
  passportValidityFrom: string;
  passportValidityTo: string;
  
  bankAccountNumber: string;
  ifscCode: string;
  aadharNumber: string;
  panNumber: string;
  
  firstEPFMember: boolean;
  enrolledDate: string;
  firstEmploymentWages: string;
  epfMemberBeforeSep2014: boolean;
  epfAmountWithdrawn: boolean;
  epsAmountWithdrawn: boolean;
  epsAmountWithdrawnAfterSep2014: boolean;
  
  declarationDate: string;
  declarationPlace: string;
  employerDeclarationDate: string;
}

interface Site {
  _id: string;
  name: string;
  clientName?: string;
  location?: string;
  status?: string;
}

interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role: string;
}

// FIXED ERROR #2: Added sites prop to the interface
interface OnboardingTabProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  salaryStructures: SalaryStructure[];
  setSalaryStructures: React.Dispatch<React.SetStateAction<SalaryStructure[]>>;
  sites?: Site[]; // Added sites prop - now using proper Site type
  newJoinees?: Employee[];
  setNewJoinees?: React.Dispatch<React.SetStateAction<Employee[]>>;
  leftEmployees?: Employee[];
  setLeftEmployees?: React.Dispatch<React.SetStateAction<Employee[]>>;
}

// Departments array
const departments = [
  "Housekeeping Management", 
  "Security Management", 
  "Parking Management", 
  "Waste Management", 
  "STP Tank Cleaning", 
  "Consumables Management",
  "Administration",
  "HR",
  "Finance",
  "IT",
  "Operations",
  "Maintenance"
];

// FormField Component
const FormField = ({ 
  label, 
  id, 
  children, 
  required = false 
}: { 
  label: string; 
  id?: string; 
  children: React.ReactNode; 
  required?: boolean;
}) => (
  <div className="space-y-2">
    <Label htmlFor={id}>
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </Label>
    {children}
  </div>
);

// Reset form function
const resetNewEmployeeForm = () => ({
  name: "",
  email: "",
  phone: "",
  aadharNumber: "",
  panNumber: "",
  esicNumber: "",
  uanNumber: "",
  siteName: "",
  dateOfBirth: "",
  dateOfJoining: new Date().toISOString().split("T")[0],
  dateOfExit: "",
  bloodGroup: "",
  permanentAddress: "",
  permanentPincode: "",
  localAddress: "",
  localPincode: "",
  bankName: "",
  accountNumber: "",
  ifscCode: "",
  branchName: "",
  fatherName: "",
  motherName: "",
  spouseName: "",
  numberOfChildren: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  emergencyContactRelation: "",
  nomineeName: "",
  nomineeRelation: "",
  pantSize: "",
  shirtSize: "",
  capSize: "",
  idCardIssued: false,
  westcoatIssued: false,
  apronIssued: false,
  department: "",
  position: "",
  salary: "",
  photo: null,
  employeeSignature: null,
  authorizedSignature: null
});

// FIXED #1: Added sites prop to function parameters and fetch supervisor sites
const OnboardingTab = ({ 
  employees, 
  setEmployees, 
  salaryStructures, 
  setSalaryStructures,
  sites = [], // Added sites prop with default value
  newJoinees = [],
  setNewJoinees,
  leftEmployees,
  setLeftEmployees
}: OnboardingTabProps) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("onboarding");
  const [newEmployee, setNewEmployee] = useState<NewEmployeeForm>(resetNewEmployeeForm());
  const [uploadedDocuments, setUploadedDocuments] = useState<File[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [createdEmployeeData, setCreatedEmployeeData] = useState<Employee | null>(null);
  const [epfFormData, setEpfFormData] = useState<EPFForm11Data>({
    memberName: "",
    fatherOrSpouseName: "",
    relationshipType: "father",
    dateOfBirth: "",
    gender: "",
    maritalStatus: "",
    email: "",
    mobileNumber: "",
    previousEPFMember: false,
    previousPensionMember: false,
    previousUAN: "",
    previousPFAccountNumber: "",
    dateOfExit: "",
    schemeCertificateNumber: "",
    pensionPaymentOrder: "",
    internationalWorker: false,
    countryOfOrigin: "",
    passportNumber: "",
    passportValidityFrom: "",
    passportValidityTo: "",
    bankAccountNumber: "",
    ifscCode: "",
    aadharNumber: "",
    panNumber: "",
    firstEPFMember: true,
    enrolledDate: new Date().toISOString().split("T")[0],
    firstEmploymentWages: "",
    epfMemberBeforeSep2014: false,
    epfAmountWithdrawn: false,
    epsAmountWithdrawn: false,
    epsAmountWithdrawnAfterSep2014: false,
    declarationDate: new Date().toISOString().split("T")[0],
    declarationPlace: "Mumbai",
    employerDeclarationDate: new Date().toISOString().split("T")[0]
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signatureEmployeeRef = useRef<HTMLInputElement>(null);
  const signatureAuthorizedRef = useRef<HTMLInputElement>(null);
  const documentUploadRef = useRef<HTMLInputElement>(null);

  // Initialize EPF Form with employee data
  const initializeEPFForm = (employee: Employee) => {
    setCreatedEmployeeData(employee);
    
    const today = new Date().toISOString().split("T")[0];
    
    // Safely get salary with fallbacks
    let salaryValue = 0;
    if (employee.salary) {
      salaryValue = typeof employee.salary === 'string' 
        ? parseFloat(employee.salary) 
        : Number(employee.salary) || 0;
    }
    
    // Safely get other properties with fallbacks
    const epfData: EPFForm11Data = {
      memberName: employee.name || "",
      fatherOrSpouseName: employee.fatherName || employee.spouseName || "",
      relationshipType: employee.fatherName ? "father" : "spouse",
      dateOfBirth: employee.dateOfBirth || "",
      gender: employee.gender || "",
      maritalStatus: employee.maritalStatus || "",
      email: employee.email || "",
      mobileNumber: employee.phone || "",
      
      previousEPFMember: false,
      previousPensionMember: false,
      
      previousUAN: employee.uanNumber || employee.uan || "",
      previousPFAccountNumber: "",
      dateOfExit: "",
      schemeCertificateNumber: "",
      pensionPaymentOrder: "",
      
      internationalWorker: false,
      countryOfOrigin: "",
      passportNumber: "",
      passportValidityFrom: "",
      passportValidityTo: "",
      
      bankAccountNumber: employee.accountNumber || "",
      ifscCode: employee.ifscCode || "",
      aadharNumber: employee.aadharNumber || "",
      panNumber: employee.panNumber || "",
      
      firstEPFMember: true,
      enrolledDate: employee.joinDate || employee.dateOfJoining || today,
      firstEmploymentWages: salaryValue.toString() || "0",
      epfMemberBeforeSep2014: false,
      epfAmountWithdrawn: false,
      epsAmountWithdrawn: false,
      epsAmountWithdrawnAfterSep2014: false,
      
      declarationDate: today,
      declarationPlace: "Mumbai",
      employerDeclarationDate: today
    };
    
    setEpfFormData(epfData);
    setActiveTab("epf-form");
    toast.success("Employee created successfully! Please fill EPF Form 11.");
  };

  const isAutoFilledField = (fieldName: keyof EPFForm11Data): boolean => {
    const autoFilledFields: (keyof EPFForm11Data)[] = [
      'memberName',
      'fatherOrSpouseName',
      'dateOfBirth',
      'gender',
      'maritalStatus',
      'email',
      'mobileNumber',
      'aadharNumber',
      'panNumber',
      'bankAccountNumber',
      'ifscCode',
      'enrolledDate',
      'firstEmploymentWages'
    ];
    
    return autoFilledFields.includes(fieldName);
  };

  // Camera functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(error => {
          console.error("Error playing video:", error);
        });
      }
      setShowCamera(true);
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("Cannot access camera. Please check permissions and try again.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageData);
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  const useCapturedPhoto = () => {
    if (capturedImage) {
      fetch(capturedImage)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'employee-photo.jpg', { type: 'image/jpeg' });
          setNewEmployee({...newEmployee, photo: file});
          toast.success("Photo captured successfully!");
        })
        .catch(error => {
          console.error("Error converting photo:", error);
          toast.error("Error processing photo. Please try again.");
        });
    }
    stopCamera();
    setShowCamera(false);
    setCapturedImage(null);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const MAX_WIDTH = 400;
            const MAX_HEIGHT = 400;
            let { width, height } = img;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob((blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, { 
                  type: 'image/jpeg', 
                  lastModified: Date.now() 
                });
                setNewEmployee({...newEmployee, photo: compressedFile});
                toast.success("Photo uploaded and compressed successfully!");
              }
            }, 'image/jpeg', 0.8);
          }
        };
        img.onerror = () => {
          toast.error("Error loading image. Please try another file.");
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        toast.error("Error reading file. Please try again.");
      };
      reader.readAsDataURL(file);
    }
  };

const handleAddEmployee = async () => {
  // Validate required fields
  if (!newEmployee.name || !newEmployee.email || !newEmployee.aadharNumber || !newEmployee.position || !newEmployee.department) {
    toast.error("Please fill all required fields (Name, Email, Aadhar Number, Position, Department)");
    return;
  }

  // Validate phone number
  if (newEmployee.phone && !/^\d{10}$/.test(newEmployee.phone)) {
    toast.error("Please enter a valid 10-digit phone number");
    return;
  }

  // Validate Aadhar number
  if (!/^\d{12}$/.test(newEmployee.aadharNumber)) {
    toast.error("Please enter a valid 12-digit Aadhar number");
    return;
  }

  // Validate PAN number if provided
  if (newEmployee.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(newEmployee.panNumber.toUpperCase())) {
    toast.error("Please enter a valid PAN number (format: ABCDE1234F)");
    return;
  }

  // Validate salary
  if (!newEmployee.salary || parseFloat(newEmployee.salary) <= 0) {
    toast.error("Please enter a valid salary amount");
    return;
  }

  setLoading(true);

  try {
    // Create FormData object
    const formData = new FormData();

    // Add employee photo if exists
    if (newEmployee.photo instanceof File) {
      formData.append('photo', newEmployee.photo);
    }

    // Add employee signature if exists
    if (newEmployee.employeeSignature instanceof File) {
      formData.append('employeeSignature', newEmployee.employeeSignature);
    }

    // Add authorized signature if exists
    if (newEmployee.authorizedSignature instanceof File) {
      formData.append('authorizedSignature', newEmployee.authorizedSignature);
    }

    // Add other form data
    const employeeDataToSend = {
      name: newEmployee.name,
      email: newEmployee.email,
      phone: newEmployee.phone,
      aadharNumber: newEmployee.aadharNumber,
      panNumber: newEmployee.panNumber?.toUpperCase() || '',
      esicNumber: newEmployee.esicNumber,
      uanNumber: newEmployee.uanNumber,
      siteName: newEmployee.siteName,
      dateOfBirth: newEmployee.dateOfBirth,
      dateOfJoining: newEmployee.dateOfJoining,
      dateOfExit: newEmployee.dateOfExit,
      bloodGroup: newEmployee.bloodGroup,
      gender: newEmployee.gender,
      maritalStatus: newEmployee.maritalStatus,
      permanentAddress: newEmployee.permanentAddress,
      permanentPincode: newEmployee.permanentPincode,
      localAddress: newEmployee.localAddress,
      localPincode: newEmployee.localPincode,
      bankName: newEmployee.bankName,
      accountNumber: newEmployee.accountNumber,
      ifscCode: newEmployee.ifscCode.toUpperCase(),
      branchName: newEmployee.branchName,
      fatherName: newEmployee.fatherName,
      motherName: newEmployee.motherName,
      spouseName: newEmployee.spouseName,
      numberOfChildren: newEmployee.numberOfChildren,
      emergencyContactName: newEmployee.emergencyContactName,
      emergencyContactPhone: newEmployee.emergencyContactPhone,
      emergencyContactRelation: newEmployee.emergencyContactRelation,
      nomineeName: newEmployee.nomineeName,
      nomineeRelation: newEmployee.nomineeRelation,
      pantSize: newEmployee.pantSize,
      shirtSize: newEmployee.shirtSize,
      capSize: newEmployee.capSize,
      idCardIssued: newEmployee.idCardIssued,
      westcoatIssued: newEmployee.westcoatIssued,
      apronIssued: newEmployee.apronIssued,
      department: newEmployee.department,
      position: newEmployee.position,
      salary: newEmployee.salary
    };

    // Append all other data
    Object.entries(employeeDataToSend).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        formData.append(key, value.toString());
      }
    });

    console.log('Sending employee data to backend...');

    const response = await fetch(`${API_URL}/employees`, {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || "Failed to create employee");
    }

    // Check different response formats
    let createdEmployee;
    
    if (data.employee) {
      // Format: { success: true, employee: {...} }
      createdEmployee = data.employee;
    } else if (data.data) {
      // Format: { success: true, data: {...} }
      createdEmployee = data.data;
    } else if (data.employees && data.employees.length > 0) {
      // Format: { success: true, employees: [...] }
      createdEmployee = data.employees[0];
    } else if (data._id) {
      // Format: direct employee object
      createdEmployee = data;
    }

    console.log('Created employee data:', createdEmployee);

    if (!createdEmployee) {
      console.error('Server response:', data);
      throw new Error('No employee data returned from server. Server response: ' + JSON.stringify(data));
    }

    toast.success("Employee created successfully!");
    
    // Ensure the employee object has all required properties
    const processedEmployee: Employee = {
      _id: createdEmployee._id,
      employeeId: createdEmployee.employeeId,
      name: createdEmployee.name,
      email: createdEmployee.email,
      phone: createdEmployee.phone,
      aadharNumber: createdEmployee.aadharNumber,
      department: createdEmployee.department,
      position: createdEmployee.position,
      joinDate: createdEmployee.joinDate || createdEmployee.dateOfJoining,
      dateOfJoining: createdEmployee.dateOfJoining,
      status: createdEmployee.status || 'active',
      salary: createdEmployee.salary || 0,
      uanNumber: createdEmployee.uanNumber,
      uan: createdEmployee.uan,
      esicNumber: createdEmployee.esicNumber,
      panNumber: createdEmployee.panNumber,
      photo: createdEmployee.photo,
      siteName: createdEmployee.siteName,
      dateOfBirth: createdEmployee.dateOfBirth,
      bloodGroup: createdEmployee.bloodGroup,
      gender: createdEmployee.gender,
      maritalStatus: createdEmployee.maritalStatus,
      permanentAddress: createdEmployee.permanentAddress,
      permanentPincode: createdEmployee.permanentPincode,
      localAddress: createdEmployee.localAddress,
      localPincode: createdEmployee.localPincode,
      bankName: createdEmployee.bankName,
      accountNumber: createdEmployee.accountNumber,
      ifscCode: createdEmployee.ifscCode,
      branchName: createdEmployee.branchName,
      fatherName: createdEmployee.fatherName,
      motherName: createdEmployee.motherName,
      spouseName: createdEmployee.spouseName,
      numberOfChildren: createdEmployee.numberOfChildren,
      emergencyContactName: createdEmployee.emergencyContactName,
      emergencyContactPhone: createdEmployee.emergencyContactPhone,
      emergencyContactRelation: createdEmployee.emergencyContactRelation,
      nomineeName: createdEmployee.nomineeName,
      nomineeRelation: createdEmployee.nomineeRelation,
      pantSize: createdEmployee.pantSize,
      shirtSize: createdEmployee.shirtSize,
      capSize: createdEmployee.capSize,
      idCardIssued: createdEmployee.idCardIssued || false,
      westcoatIssued: createdEmployee.westcoatIssued || false,
      apronIssued: createdEmployee.apronIssued || false,
      employeeSignature: createdEmployee.employeeSignature,
      authorizedSignature: createdEmployee.authorizedSignature,
      createdAt: createdEmployee.createdAt,
      updatedAt: createdEmployee.updatedAt
    };
    
    // Update employees list with the new employee
    setEmployees(prev => [...prev, processedEmployee]);
    
    // Reset form FIRST
    setNewEmployee(resetNewEmployeeForm());
    setUploadedDocuments([]);
    
    // Then initialize EPF Form and switch tabs
    initializeEPFForm(processedEmployee);

  } catch (error: any) {
    console.error("Error creating employee:", error);
    toast.error(error.message || "Error creating employee. Please try again.");
  } finally {
    setLoading(false);
  }
};

  const handleDocumentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newDocuments = Array.from(files);
      setUploadedDocuments(prev => [...prev, ...newDocuments]);
      toast.success(`${newDocuments.length} document(s) uploaded successfully!`);
    }
  };

  const handleRemoveDocument = (index: number) => {
    setUploadedDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSignatureUpload = (type: 'employee' | 'authorized', event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (type === 'employee') {
        setNewEmployee({...newEmployee, employeeSignature: file});
      } else {
        setNewEmployee({...newEmployee, authorizedSignature: file});
      }
      toast.success(`${type === 'employee' ? 'Employee' : 'Authorized'} signature uploaded successfully!`);
    }
  };

  const handleEPFFormChange = (field: keyof EPFForm11Data, value: any) => {
    setEpfFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveEPFForm = async () => {
    if (!epfFormData.memberName || !epfFormData.aadharNumber || !createdEmployeeData) {
      toast.error("Please fill all required fields and select an employee");
      return;
    }

    // Validate Aadhar number
    if (!/^\d{12}$/.test(epfFormData.aadharNumber)) {
      toast.error("Please enter a valid 12-digit Aadhar number");
      return;
    }

    // Validate PAN number if provided
    if (epfFormData.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(epfFormData.panNumber)) {
      toast.error("Please enter a valid PAN number (format: ABCDE1234F)");
      return;
    }

    try {
      // Use _id (MongoDB ObjectId) instead of employeeId
      const employeeId = createdEmployeeData._id;
      
      if (!employeeId) {
        toast.error("Invalid employee data");
        return;
      }
      
      const response = await fetch(`${API_URL}/epf-forms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...epfFormData,
          employeeId: employeeId,
          employeeNumber: createdEmployeeData.employeeId,
          firstEmploymentWages: parseFloat(epfFormData.firstEmploymentWages) || 0,
          enrolledDate: new Date(epfFormData.enrolledDate || createdEmployeeData.joinDate || createdEmployeeData.dateOfJoining || new Date()),
          declarationDate: new Date(epfFormData.declarationDate || new Date()),
          employerDeclarationDate: new Date(epfFormData.employerDeclarationDate || new Date())
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save EPF Form");
      }

      if (data.success) {
        toast.success("EPF Form saved successfully!");
        setActiveTab("onboarding");
        setCreatedEmployeeData(null);
        // Reset EPF form data
        setEpfFormData({
          memberName: "",
          fatherOrSpouseName: "",
          relationshipType: "father",
          dateOfBirth: "",
          gender: "",
          maritalStatus: "",
          email: "",
          mobileNumber: "",
          previousEPFMember: false,
          previousPensionMember: false,
          previousUAN: "",
          previousPFAccountNumber: "",
          dateOfExit: "",
          schemeCertificateNumber: "",
          pensionPaymentOrder: "",
          internationalWorker: false,
          countryOfOrigin: "",
          passportNumber: "",
          passportValidityFrom: "",
          passportValidityTo: "",
          bankAccountNumber: "",
          ifscCode: "",
          aadharNumber: "",
          panNumber: "",
          firstEPFMember: true,
          enrolledDate: new Date().toISOString().split("T")[0],
          firstEmploymentWages: "",
          epfMemberBeforeSep2014: false,
          epfAmountWithdrawn: false,
          epsAmountWithdrawn: false,
          epsAmountWithdrawnAfterSep2014: false,
          declarationDate: new Date().toISOString().split("T")[0],
          declarationPlace: "Mumbai",
          employerDeclarationDate: new Date().toISOString().split("T")[0]
        });
      } else {
        toast.error(data.message || "Failed to save EPF Form");
      }
    } catch (error: any) {
      console.error("Error saving EPF Form:", error);
      toast.error(error.message || "Error saving EPF Form");
    }
  };

  const handlePrintEPFForm = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Please allow popups to print forms");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>EPF Form 11 - ${epfFormData.memberName}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px;
              font-size: 12px;
              line-height: 1.4;
            }
            .form-container { 
              max-width: 800px; 
              margin: 0 auto; 
              border: 1px solid #000;
              padding: 20px;
              position: relative;
            }
            .header { 
              text-align: center; 
              margin-bottom: 20px;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
            }
            .header h2 {
              margin: 0;
              font-size: 16px;
              font-weight: bold;
            }
            .header h3 {
              margin: 5px 0;
              font-size: 14px;
              font-weight: normal;
            }
            .subtitle {
              font-size: 10px;
              margin-top: 5px;
              font-style: italic;
            }
            .section { 
              margin-bottom: 20px; 
            }
            .section-title { 
              background: #f0f0f0; 
              padding: 8px; 
              font-weight: bold;
              border: 1px solid #000;
              margin-bottom: 10px;
              font-size: 11px;
            }
            .field-row {
              display: flex;
              margin-bottom: 8px;
              align-items: flex-start;
            }
            .field-group {
              display: flex;
              flex-direction: column;
              margin-right: 20px;
              flex: 1;
            }
            .label { 
              font-weight: bold; 
              margin-bottom: 2px;
              font-size: 10px;
            }
            .value { 
              min-height: 18px;
              border-bottom: 1px solid #000;
              padding: 2px 5px;
              flex: 1;
            }
            .checkbox-group {
              display: flex;
              align-items: center;
              margin-right: 15px;
            }
            .checkbox {
              margin-right: 5px;
            }
            .full-width {
              width: 100%;
            }
            .half-width {
              width: 48%;
            }
            .quarter-width {
              width: 24%;
            }
            .signature-area { 
              margin-top: 30px; 
              border-top: 1px solid #000; 
              padding-top: 15px;
            }
            .signature-line {
              display: inline-block;
              width: 200px;
              border-bottom: 1px solid #000;
              margin: 0 10px;
            }
            .declaration {
              margin: 20px 0;
              padding: 15px;
              border: 1px solid #000;
              background: #f9f9f9;
            }
            .declaration p {
              margin: 5px 0;
              font-size: 11px;
            }
            .note {
              font-size: 10px;
              font-style: italic;
              color: #666;
              margin-top: 3px;
            }
            @media print {
              body { margin: 0; padding: 10px; }
              .form-container { border: none; padding: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="form-container">
            <div class="header">
              <h2>New Form : 11 - Declaration Form</h2>
              <h3>(To be retained by the employer for future reference)</h3>
              <div class="subtitle">EMPLOYEES' PROVIDENT FUND ORGANISATION</div>
              <div class="subtitle">Employees' Provident Fund Scheme, 1952 (Paragraph 34 & 57) and Employees' Pension Scheme, 1995 (Paragraph 24)</div>
              <div class="subtitle">(Declaration by a person taking up Employment in any Establishment on which EPF Scheme, 1952 and for EPS, 1995 is applicable)</div>
            </div>
            
            <div class="section">
              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">1. Name of Member (Aadhar Name)</div>
                  <div class="value">${epfFormData.memberName}</div>
                </div>
              </div>

              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">2. ${epfFormData.relationshipType === 'father' ? 'Father\'s Name' : 'Spouse\'s Name'}</div>
                  <div class="value">${epfFormData.fatherOrSpouseName}</div>
                  <div class="note">(Please tick whichever applicable)</div>
                </div>
              </div>

              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">3. Date of Birth (dd/mm/yyyy)</div>
                  <div class="value">${epfFormData.dateOfBirth}</div>
                </div>
                <div class="field-group half-width">
                  <div class="label">4. Gender (Male / Female / Transgender)</div>
                  <div class="value">${epfFormData.gender}</div>
                </div>
              </div>

              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">5. Marital Status ? (Single/Married/Widow/Widower/Divorcee)</div>
                  <div class="value">${epfFormData.maritalStatus}</div>
                </div>
              </div>

              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">6. (a) eMail ID</div>
                  <div class="value">${epfFormData.email}</div>
                </div>
                <div class="field-group half-width">
                  <div class="label">(b) Mobile No (Aadhar Registered)</div>
                  <div class="value">${epfFormData.mobileNumber}</div>
                </div>
              </div>

              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">7. Whether earlier member of the Employee's Provident Fund Scheme, 1952 ?</div>
                  <div class="checkbox-group">
                    <input type="checkbox" class="checkbox" ${epfFormData.previousEPFMember ? 'checked' : ''}> Yes
                    <input type="checkbox" class="checkbox" ${!epfFormData.previousEPFMember ? 'checked' : ''}> No
                  </div>
                </div>
                <div class="field-group half-width">
                  <div class="label">8. Whether earlier member of the Employee's Pension Scheme, 1995 ?</div>
                  <div class="checkbox-group">
                    <input type="checkbox" class="checkbox" ${epfFormData.previousPensionMember ? 'checked' : ''}> Yes
                    <input type="checkbox" class="checkbox" ${!epfFormData.previousPensionMember ? 'checked' : ''}> No
                  </div>
                </div>
              </div>

              <div class="section-title">9. Previous Employment details ? (If Yes, 7 & 8 details above)</div>
              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">a) Universal Account Number (UAN)</div>
                  <div class="value">${epfFormData.previousUAN}</div>
                </div>
                <div class="field-group half-width">
                  <div class="label">b) Previous PF Account Number</div>
                  <div class="value">${epfFormData.previousPFAccountNumber}</div>
                </div>
              </div>

              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">c) Date of Exit from previous Employment ? (dd/mm/yyyy)</div>
                  <div class="value">${epfFormData.dateOfExit}</div>
                </div>
                <div class="field-group half-width">
                  <div class="label">d) Scheme Certificate No (If issued)</div>
                  <div class="value">${epfFormData.schemeCertificateNumber}</div>
                </div>
              </div>

              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">e) Pension Payment Order (PPO) (If issued)</div>
                  <div class="value">${epfFormData.pensionPaymentOrder}</div>
                </div>
              </div>

              <div class="section-title">10. International Worker Details</div>
              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">a) International Worker</div>
                  <div class="checkbox-group">
                    <input type="checkbox" class="checkbox" ${epfFormData.internationalWorker ? 'checked' : ''}> Yes
                    <input type="checkbox" class="checkbox" ${!epfFormData.internationalWorker ? 'checked' : ''}> No
                  </div>
                </div>
                <div class="field-group half-width">
                  <div class="label">b) If Yes, state country of origin (name of other country)</div>
                  <div class="value">${epfFormData.countryOfOrigin}</div>
                </div>
              </div>

              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">c) Passport No.</div>
                  <div class="value">${epfFormData.passportNumber}</div>
                </div>
                <div class="field-group half-width">
                  <div class="label">d) Validity of passport (dd/mm/yyyy) to (dd/mm/yyyy)</div>
                  <div class="value">${epfFormData.passportValidityFrom} to ${epfFormData.passportValidityTo}</div>
                </div>
              </div>

              <div class="section-title">11. KYC Details : (attach self attested copies of following KYC's)</div>
              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">a) Bank Account No. & IFS Code</div>
                  <div class="value">${epfFormData.bankAccountNumber} / ${epfFormData.ifscCode}</div>
                </div>
                <div class="field-group half-width">
                  <div class="label">b) AADHAR Number</div>
                  <div class="value">${epfFormData.aadharNumber}</div>
                </div>
              </div>

              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">c) Permanent Account Number (PAN), If available</div>
                  <div class="value">${epfFormData.panNumber}</div>
                </div>
              </div>

              <div class="section-title">12. Declaration Details</div>
              <div class="field-row">
                <div class="field-group quarter-width">
                  <div class="label">First EPF Member</div>
                  <div class="checkbox-group">
                    <input type="checkbox" class="checkbox" ${epfFormData.firstEPFMember ? 'checked' : ''}> Yes
                    <input type="checkbox" class="checkbox" ${!epfFormData.firstEPFMember ? 'checked' : ''}> No
                  </div>
                </div>
                <div class="field-group quarter-width">
                  <div class="label">Enrolled Date</div>
                  <div class="value">${epfFormData.enrolledDate}</div>
                </div>
                <div class="field-group quarter-width">
                  <div class="label">First Employment EPF Wages</div>
                  <div class="value">₹${epfFormData.firstEmploymentWages}</div>
                </div>
              </div>

              <div class="field-row">
                <div class="field-group quarter-width">
                  <div class="label">Are you EPF Member before 01/09/2014</div>
                  <div class="checkbox-group">
                    <input type="checkbox" class="checkbox" ${epfFormData.epfMemberBeforeSep2014 ? 'checked' : ''}> Yes
                    <input type="checkbox" class="checkbox" ${!epfFormData.epfMemberBeforeSep2014 ? 'checked' : ''}> No
                  </div>
                </div>
                <div class="field-group quarter-width">
                  <div class="label">If Yes, EPF Amount Withdrawn?</div>
                  <div class="checkbox-group">
                    <input type="checkbox" class="checkbox" ${epfFormData.epfAmountWithdrawn ? 'checked' : ''}> Yes
                    <input type="checkbox" class="checkbox" ${!epfFormData.epfAmountWithdrawn ? 'checked' : ''}> No
                  </div>
                </div>
                <div class="field-group quarter-width">
                  <div class="label">If Yes, EPS (Pension) Amount Withdrawn?</div>
                  <div class="checkbox-group">
                    <input type="checkbox" class="checkbox" ${epfFormData.epsAmountWithdrawn ? 'checked' : ''}> Yes
                    <input type="checkbox" class="checkbox" ${!epfFormData.epsAmountWithdrawn ? 'checked' : ''}> No
                  </div>
                </div>
                <div class="field-group quarter-width">
                  <div class="label">After Sep 2014 earned EPS (Pension) Amount Withdrawn before Join current Employer?</div>
                  <div class="checkbox-group">
                    <input type="checkbox" class="checkbox" ${epfFormData.epsAmountWithdrawnAfterSep2014 ? 'checked' : ''}> Yes
                    <input type="checkbox" class="checkbox" ${!epfFormData.epsAmountWithdrawnAfterSep2014 ? 'checked' : ''}> No
                  </div>
                </div>
              </div>

              <div class="declaration">
                <p><strong>UNDERTAKING</strong></p>
                <p>1) Certified that the particulars are true to the best of my knowledge</p>
                <p>2) I authorise EPFO to use my Aadhar for verification / authentication / eKYC purpose for service delivery</p>
                <p>3) Kindly transfer the fund and service details, if applicable, from the previous PF account as declared above to the present PF account.</p>
                <p>(The transfer would be possible only if the identified KYC details approved by previous employer has been verified by present employer using his Digital Signature</p>
                <p>4) In case of changes in above details, the same will be intimated to employer at the earliest.</p>
              </div>

              <div class="signature-area">
                <div class="field-row">
                  <div class="field-group half-width">
                    <div class="label">Date :</div>
                    <div class="value">${epfFormData.declarationDate}</div>
                  </div>
                  <div class="field-group half-width">
                    <div class="label">Place :</div>
                    <div class="value">________________</div>
                  </div>
                </div>
                <div class="field-row">
                  <div class="field-group full-width">
                    <div class="label">Signature of Member</div>
                    <div class="value" style="height: 40px;"></div>
                  </div>
                </div>
              </div>

              <div class="section-title">DECLARATION BY PRESENT EMPLOYER</div>
              
              <div class="field-row">
                <div class="field-group full-width">
                  <div class="label">A. The member Mr./Ms./Mrs. ${epfFormData.memberName} has joined on ${epfFormData.enrolledDate} and has been allotted PF Number ${createdEmployeeData?.uanNumber || createdEmployeeData?.uan || "Pending"}</div>
                </div>
              </div>

              <div class="field-row">
                <div class="field-group full-width">
                  <div class="label">B. In case the person was earlier not a member of EPF Scheme, 1952 and EPS, 1995: ((Post allotment of UAN) The UAN allotted or the member is) Please Tick the Appropriate Option :</div>
                </div>
              </div>

              <div class="field-row">
                <div class="checkbox-group">
                  <input type="checkbox" class="checkbox"> The KYC details of the above member in the JAN database have not been uploaded
                </div>
              </div>
              <div class="field-row">
                <div class="checkbox-group">
                  <input type="checkbox" class="checkbox"> Have been uploaded but not approved
                </div>
              </div>
              <div class="field-row">
                <div class="checkbox-group">
                  <input type="checkbox" class="checkbox"> Have been uploaded and approved with DSC
                </div>
              </div>

              <div class="field-row">
                <div class="field-group full-width">
                  <div class="label">C. In case the person was earlier a member of EPF Scheme, 1952 and EPS 1995;</div>
                </div>
              </div>

              <div class="field-row">
                <div class="checkbox-group">
                  <input type="checkbox" class="checkbox"> The KYC details of the above member in the UAN database have been approved with Digital Signature Certificate and transfer request has been generated on portal
                </div>
              </div>
              <div class="field-row">
                <div class="checkbox-group">
                  <input type="checkbox" class="checkbox"> As the DSC of establishment are not registered with EPFO, the member has been informed to file physical claim (Form-13) for transfer of funds from his previous establishment.
                </div>
              </div>

              <div class="signature-area">
                <div class="field-row">
                  <div class="field-group half-width">
                    <div class="label">Date :</div>
                    <div class="value">${epfFormData.employerDeclarationDate}</div>
                  </div>
                </div>
                <div class="field-row">
                  <div class="field-group full-width">
                    <div class="label">Signature of Employer with Seal of Establishment</div>
                    <div class="value" style="height: 40px;"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => {
                window.close();
              }, 1000);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Function to manually open EPF form for an existing employee
  const handleOpenEPFForm = (employee: Employee) => {
    initializeEPFForm(employee);
  };

  return (
    <div className="space-y-6">
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Capture Photo</h3>
              <Button variant="ghost" size="sm" onClick={() => { setShowCamera(false); stopCamera(); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-4">
              {!capturedImage ? (
                <>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted
                    className="w-full h-64 bg-gray-100 rounded-lg"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="flex gap-2 mt-4">
                    <Button onClick={capturePhoto} className="flex-1">
                      <Camera className="h-4 w-4 mr-2" />
                      Capture Photo
                    </Button>
                    <Button variant="outline" onClick={() => { setShowCamera(false); stopCamera(); }}>
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <img 
                    src={capturedImage} 
                    alt="Captured" 
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  <div className="flex gap-2 mt-4">
                    <Button onClick={useCapturedPhoto} className="flex-1">
                      Use This Photo
                    </Button>
                    <Button variant="outline" onClick={retakePhoto}>
                      Retake Photo
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="onboarding" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Employee Onboarding
          </TabsTrigger>
          <TabsTrigger value="epf-form" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            EPF Form 11
          </TabsTrigger>
        </TabsList>

        <TabsContent value="onboarding">
          <Card>
            <CardHeader>
              <CardTitle>Digital Onboarding & Document Verification</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-gray-300 p-4 md:p-6 mb-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="text-center mb-4">
                      <div className="text-xl md:text-2xl font-bold">SK ENTERPRISES</div>
                      <div className="text-xs md:text-sm text-muted-foreground">Housekeeping • Parking • Waste Management</div>
                      <div className="text-lg font-semibold mt-2">Employee Joining Form</div>
                    </div>
                    
                    <div className="flex justify-between items-start flex-col md:flex-row gap-4">
                      <div className="border-2 border-dashed border-gray-400 w-20 h-24 md:w-24 md:h-32 flex items-center justify-center text-xs text-muted-foreground text-center p-2 mx-auto md:mx-0">
                        {newEmployee.photo ? (
                          <img 
                            src={newEmployee.photo instanceof File 
                              ? URL.createObjectURL(newEmployee.photo) 
                              : newEmployee.photo} 
                            alt="Employee" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          "Photo"
                        )}
                      </div>
                      
                      <div className="text-center md:text-right space-y-2 w-full md:w-auto">
                        <div className="text-sm font-semibold">New Joining</div>
                        <div className="text-sm">
                          Code No. / Ref No.: <span className="border-b border-gray-400 inline-block min-w-[100px]">Auto-generated</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 md:gap-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Employee Details</h3>
                  
                  <div className="space-y-4">
                    <Label>Employee Photo</Label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={startCamera}
                        className="flex items-center gap-2"
                      >
                        <Camera className="h-4 w-4" />
                        Take Photo
                      </Button>
                      
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Upload Photo
                      </Button>
                      
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                    
                    {newEmployee.photo && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm text-green-600">Photo selected</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setNewEmployee({...newEmployee, photo: null})}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    {/* UPDATED: Site Name dropdown with sites from props */}
                    <FormField label="Site Name" id="siteName">
                      <Select 
                        value={newEmployee.siteName} 
                        onValueChange={(value) => setNewEmployee({...newEmployee, siteName: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select site" />
                        </SelectTrigger>
                        <SelectContent>
                          {sites && sites.length > 0 ? (
                            sites.map((site) => (
                              <SelectItem key={site._id} value={site.name}>
                                {site.name}
                                {site.clientName && ` - ${site.clientName}`}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-sites" disabled>
                              No sites assigned
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {sites && sites.length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          No sites are assigned to you. Please contact administrator.
                        </p>
                      )}
                    </FormField>
                    
                    <FormField label="Name" id="name" required>
                      <Input
                        id="name"
                        value={newEmployee.name}
                        onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                        placeholder="Enter full name"
                        required
                      />
                    </FormField>
                    
                    <FormField label="Date of Birth" id="dateOfBirth">
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={newEmployee.dateOfBirth}
                        onChange={(e) => setNewEmployee({...newEmployee, dateOfBirth: e.target.value})}
                      />
                    </FormField>
                    
                    <FormField label="Date of Joining" id="dateOfJoining">
                      <Input
                        id="dateOfJoining"
                        type="date"
                        value={newEmployee.dateOfJoining}
                        onChange={(e) => setNewEmployee({...newEmployee, dateOfJoining: e.target.value})}
                      />
                    </FormField>
                    
                    <FormField label="Date of Exit" id="dateOfExit">
                      <Input
                        id="dateOfExit"
                        type="date"
                        value={newEmployee.dateOfExit}
                        onChange={(e) => setNewEmployee({...newEmployee, dateOfExit: e.target.value})}
                      />
                    </FormField>
                    
                    <FormField label="Contact No." id="phone" required>
                      <Input
                        id="phone"
                        value={newEmployee.phone}
                        onChange={(e) => setNewEmployee({...newEmployee, phone: e.target.value})}
                        placeholder="Enter 10-digit phone number"
                        required
                        pattern="[0-9]{10}"
                        maxLength={10}
                      />
                    </FormField>
        
                    <FormField label="Blood Group" id="bloodGroup">
                      <Select 
                        value={newEmployee.bloodGroup || ""} 
                        onValueChange={(value) => setNewEmployee({...newEmployee, bloodGroup: value === "" ? null : value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select blood group (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A+">A +ve</SelectItem>
                          <SelectItem value="A-">A -ve</SelectItem>
                          <SelectItem value="B+">B +ve</SelectItem>
                          <SelectItem value="B-">B -ve</SelectItem>
                          <SelectItem value="O+">O +ve</SelectItem>
                          <SelectItem value="O-">O -ve</SelectItem>
                          <SelectItem value="AB+">AB +ve</SelectItem>
                          <SelectItem value="AB-">AB -ve</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    
                    <FormField label="Email" id="email" required>
                      <Input
                        id="email"
                        type="email"
                        value={newEmployee.email}
                        onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                        placeholder="Enter email address"
                        required
                      />
                    </FormField>
                    
                    <FormField label="Aadhar Number" id="aadharNumber" required>
                      <Input
                        id="aadharNumber"
                        value={newEmployee.aadharNumber}
                        onChange={(e) => setNewEmployee({...newEmployee, aadharNumber: e.target.value})}
                        placeholder="Enter 12-digit Aadhar number"
                        required
                        pattern="[0-9]{12}"
                        maxLength={12}
                      />
                    </FormField>
                    
                    <FormField label="PAN Number" id="panNumber">
                      <Input
                        id="panNumber"
                        value={newEmployee.panNumber}
                        onChange={(e) => setNewEmployee({ ...newEmployee, panNumber: e.target.value.toUpperCase() })}
                        placeholder="Enter PAN number (Optional)"
                        maxLength={10}
                        className="uppercase"
                      />
                    </FormField>
                    
                    <FormField label="ESIC Number" id="esicNumber">
                      <Input
                        id="esicNumber"
                        value={newEmployee.esicNumber}
                        onChange={(e) => setNewEmployee({...newEmployee, esicNumber: e.target.value})}
                        placeholder="Enter ESIC number"
                      />
                    </FormField>

                    <FormField label="PF Number / UAN" id="uanNumber">
                      <Input
                        id="uanNumber"
                        value={newEmployee.uanNumber}
                        onChange={(e) => setNewEmployee({...newEmployee, uanNumber: e.target.value})}
                        placeholder="Enter PF number or UAN"
                      />
                    </FormField>

                    <FormField label="Gender" id="gender">
                      <Select 
                        value={newEmployee.gender} 
                        onValueChange={(value) => setNewEmployee({...newEmployee, gender: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Transgender">Transgender</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>

                    <FormField label="Marital Status" id="maritalStatus">
                      <Select 
                        value={newEmployee.maritalStatus} 
                        onValueChange={(value) => setNewEmployee({...newEmployee, maritalStatus: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select marital status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Single">Single</SelectItem>
                          <SelectItem value="Married">Married</SelectItem>
                          <SelectItem value="Widow">Widow</SelectItem>
                          <SelectItem value="Widower">Widower</SelectItem>
                          <SelectItem value="Divorcee">Divorcee</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>
                  
                  <FormField label="Permanent Address" id="permanentAddress">
                    <Textarea
                      id="permanentAddress"
                      value={newEmployee.permanentAddress}
                      onChange={(e) => setNewEmployee({...newEmployee, permanentAddress: e.target.value})}
                      placeholder="Enter permanent address"
                      rows={3}
                    />
                  </FormField>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <FormField label="Pin Code" id="permanentPincode">
                      <Input
                        id="permanentPincode"
                        value={newEmployee.permanentPincode}
                        onChange={(e) => setNewEmployee({...newEmployee, permanentPincode: e.target.value})}
                        placeholder="Enter pin code"
                        maxLength={6}
                      />
                    </FormField>
                  </div>
                  
                  <FormField label="Local Address" id="localAddress">
                    <Textarea
                      id="localAddress"
                      value={newEmployee.localAddress}
                      onChange={(e) => setNewEmployee({...newEmployee, localAddress: e.target.value})}
                      placeholder="Enter local address"
                      rows={3}
                    />
                  </FormField>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <FormField label="Pin Code" id="localPincode">
                      <Input
                        id="localPincode"
                        value={newEmployee.localPincode}
                        onChange={(e) => setNewEmployee({...newEmployee, localPincode: e.target.value})}
                        placeholder="Enter pin code"
                        maxLength={6}
                      />
                    </FormField>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Bank Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <FormField label="Bank Name" id="bankName">
                      <Input
                        id="bankName"
                        value={newEmployee.bankName}
                        onChange={(e) => setNewEmployee({...newEmployee, bankName: e.target.value})}
                        placeholder="Enter bank name"
                      />
                    </FormField>
                    
                    <FormField label="Account Number" id="accountNumber">
                      <Input
                        id="accountNumber"
                        value={newEmployee.accountNumber}
                        onChange={(e) => setNewEmployee({...newEmployee, accountNumber: e.target.value})}
                        placeholder="Enter account number"
                      />
                    </FormField>
                    
                    <FormField label="IFSC Code" id="ifscCode">
                      <Input
                        id="ifscCode"
                        value={newEmployee.ifscCode}
                        onChange={(e) => setNewEmployee({ ...newEmployee, ifscCode: e.target.value.toUpperCase() })}
                        placeholder="Enter IFSC code (Optional)"
                        className="uppercase"
                      />
                    </FormField>
                    
                    <FormField label="Branch Name" id="branchName">
                      <Input
                        id="branchName"
                        value={newEmployee.branchName}
                        onChange={(e) => setNewEmployee({...newEmployee, branchName: e.target.value})}
                        placeholder="Enter branch name"
                      />
                    </FormField>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Family Details for ESIC</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <FormField label="Father's Name" id="fatherName">
                      <Input
                        id="fatherName"
                        value={newEmployee.fatherName}
                        onChange={(e) => setNewEmployee({...newEmployee, fatherName: e.target.value})}
                        placeholder="Enter father's name"
                      />
                    </FormField>
                    
                    <FormField label="Mother's Name" id="motherName">
                      <Input
                        id="motherName"
                        value={newEmployee.motherName}
                        onChange={(e) => setNewEmployee({...newEmployee, motherName: e.target.value})}
                        placeholder="Enter mother's name"
                      />
                    </FormField>
                    
                    <FormField label="Spouse Name" id="spouseName">
                      <Input
                        id="spouseName"
                        value={newEmployee.spouseName}
                        onChange={(e) => setNewEmployee({...newEmployee, spouseName: e.target.value})}
                        placeholder="Enter spouse name"
                      />
                    </FormField>
                    
                    <FormField label="Number of Children" id="numberOfChildren">
                      <Input
                        id="numberOfChildren"
                        type="number"
                        value={newEmployee.numberOfChildren}
                        onChange={(e) => setNewEmployee({...newEmployee, numberOfChildren: e.target.value})}
                        placeholder="Enter number of children"
                        min="0"
                      />
                    </FormField>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Emergency Contact</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <FormField label="Emergency Contact Name" id="emergencyContactName">
                      <Input
                        id="emergencyContactName"
                        value={newEmployee.emergencyContactName}
                        onChange={(e) => setNewEmployee({...newEmployee, emergencyContactName: e.target.value})}
                        placeholder="Enter emergency contact name"
                      />
                    </FormField>
                    
                    <FormField label="Emergency Contact Phone" id="emergencyContactPhone">
                      <Input
                        id="emergencyContactPhone"
                        value={newEmployee.emergencyContactPhone}
                        onChange={(e) => setNewEmployee({...newEmployee, emergencyContactPhone: e.target.value})}
                        placeholder="Enter emergency contact phone"
                        pattern="[0-9]{10}"
                        maxLength={10}
                      />
                    </FormField>
                    
                    <FormField label="Relation" id="emergencyContactRelation">
                      <Input
                        id="emergencyContactRelation"
                        value={newEmployee.emergencyContactRelation}
                        onChange={(e) => setNewEmployee({...newEmployee, emergencyContactRelation: e.target.value})}
                        placeholder="Enter relation"
                      />
                    </FormField>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Nominee Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <FormField label="Nominee Name" id="nomineeName">
                      <Input
                        id="nomineeName"
                        value={newEmployee.nomineeName}
                        onChange={(e) => setNewEmployee({...newEmployee, nomineeName: e.target.value})}
                        placeholder="Enter nominee name"
                      />
                    </FormField>
                    
                    <FormField label="Nominee Relation" id="nomineeRelation">
                      <Input
                        id="nomineeRelation"
                        value={newEmployee.nomineeRelation}
                        onChange={(e) => setNewEmployee({...newEmployee, nomineeRelation: e.target.value})}
                        placeholder="Enter nominee relation"
                      />
                    </FormField>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Uniform Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <FormField label="Pant Size" id="pantSize">
                      <Select value={newEmployee.pantSize} onValueChange={(value) => setNewEmployee({...newEmployee, pantSize: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select pant size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="28">28</SelectItem>
                          <SelectItem value="30">30</SelectItem>
                          <SelectItem value="32">32</SelectItem>
                          <SelectItem value="34">34</SelectItem>
                          <SelectItem value="36">36</SelectItem>
                          <SelectItem value="38">38</SelectItem>
                          <SelectItem value="40">40</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    
                    <FormField label="Shirt Size" id="shirtSize">
                      <Select value={newEmployee.shirtSize} onValueChange={(value) => setNewEmployee({...newEmployee, shirtSize: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select shirt size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="S">S</SelectItem>
                          <SelectItem value="M">M</SelectItem>
                          <SelectItem value="L">L</SelectItem>
                          <SelectItem value="XL">XL</SelectItem>
                          <SelectItem value="XXL">XXL</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    
                    <FormField label="Cap Size" id="capSize">
                      <Select value={newEmployee.capSize} onValueChange={(value) => setNewEmployee({...newEmployee, capSize: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select cap size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="S">S</SelectItem>
                          <SelectItem value="M">M</SelectItem>
                          <SelectItem value="L">L</SelectItem>
                          <SelectItem value="XL">XL</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="idCardIssued"
                        checked={newEmployee.idCardIssued}
                        onChange={(e) => setNewEmployee({...newEmployee, idCardIssued: e.target.checked})}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="idCardIssued">ID Card Issued</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="westcoatIssued"
                        checked={newEmployee.westcoatIssued}
                        onChange={(e) => setNewEmployee({...newEmployee, westcoatIssued: e.target.checked})}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="westcoatIssued">Westcoat Issued</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="apronIssued"
                        checked={newEmployee.apronIssued}
                        onChange={(e) => setNewEmployee({...newEmployee, apronIssued: e.target.checked})}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="apronIssued">Apron Issued</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Employment Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <FormField label="Department" id="department" required>
                      <Select 
                        value={newEmployee.department} 
                        onValueChange={(value) => setNewEmployee({...newEmployee, department: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map(dept => (
                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                    
                    <FormField label="Position" id="position" required>
                      <Input
                        id="position"
                        value={newEmployee.position}
                        onChange={(e) => setNewEmployee({...newEmployee, position: e.target.value})}
                        placeholder="Enter position"
                        required
                      />
                    </FormField>
                    
                    <FormField label="Monthly Salary (₹)" id="salary" required>
                      <Input
                        id="salary"
                        type="number"
                        value={newEmployee.salary}
                        onChange={(e) => setNewEmployee({...newEmployee, salary: e.target.value})}
                        placeholder="Enter monthly salary"
                        required
                        min="0"
                        step="0.01"
                      />
                    </FormField>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Signatures</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-4">
                      <FormField label="Employee Signature" id="employeeSignature">
                        <div className="border-2 border-dashed rounded-lg p-4 md:p-6 text-center">
                          <FileText className="mx-auto h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
                          <p className="mt-2 text-sm text-muted-foreground">
                            Upload employee signature
                          </p>
                          <Input
                            ref={signatureEmployeeRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSignatureUpload('employee', e)}
                            className="hidden"
                            id="employee-signature-upload"
                          />
                          <Label htmlFor="employee-signature-upload">
                            <Button 
                              variant="outline" 
                              className="mt-4" 
                              onClick={() => signatureEmployeeRef.current?.click()}
                            >
                              Upload Signature
                            </Button>
                          </Label>
                          {newEmployee.employeeSignature && (
                            <p className="mt-2 text-sm text-green-600">
                              Signature uploaded
                            </p>
                          )}
                        </div>
                      </FormField>
                    </div>
                    
                    <div className="space-y-4">
                      <FormField label="Authorized Signature" id="authorizedSignature">
                        <div className="border-2 border-dashed rounded-lg p-4 md:p-6 text-center">
                          <FileText className="mx-auto h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
                          <p className="mt-2 text-sm text-muted-foreground">
                            Upload authorized signature
                          </p>
                          <Input
                            ref={signatureAuthorizedRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSignatureUpload('authorized', e)}
                            className="hidden"
                            id="authorized-signature-upload"
                          />
                          <Label htmlFor="authorized-signature-upload">
                            <Button 
                              variant="outline" 
                              className="mt-4" 
                              onClick={() => signatureAuthorizedRef.current?.click()}
                            >
                              Upload Signature
                            </Button>
                          </Label>
                          {newEmployee.authorizedSignature && (
                            <p className="mt-2 text-sm text-green-600">
                              Signature uploaded
                            </p>
                          )}
                        </div>
                      </FormField>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Document Upload</h3>
                  
                  <div className="border-2 border-dashed rounded-lg p-4 md:p-6 text-center">
                    <Upload className="mx-auto h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Drag and drop documents here or click to browse
                    </p>
                    <Input
                      ref={documentUploadRef}
                      type="file"
                      multiple
                      onChange={handleDocumentUpload}
                      className="hidden"
                      id="document-upload"
                    />
                    <Label htmlFor="document-upload">
                      <Button 
                        variant="outline" 
                        className="mt-4" 
                        onClick={() => documentUploadRef.current?.click()}
                      >
                        Browse Files
                      </Button>
                    </Label>
                  </div>
                  
                  {uploadedDocuments.length > 0 && (
                    <div className="space-y-2">
                      <Label>Uploaded Documents</Label>
                      <div className="space-y-2">
                        {uploadedDocuments.map((doc, index) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              <span className="text-sm">{doc.name}</span>
                            </div>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRemoveDocument(index)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label>Required Documents</Label>
                    <div className="text-sm text-muted-foreground space-y-1 grid grid-cols-1 md:grid-cols-2 gap-1">
                      <div>• Aadhar Card</div>
                      <div>• PAN Card</div>
                      <div>• Educational Certificates</div>
                      <div>• Experience Letters</div>
                      <div>• Bank Details</div>
                      <div>• Passport Size Photo</div>
                      <div>• ESIC Family Details</div>
                      <div>• PF/ESIC Documents</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button onClick={handleAddEmployee} className="flex-1" size="lg" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Employee...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Employee & Fill EPF Form
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="epf-form">
          {createdEmployeeData ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  EPF Form 11 - Declaration Form
                </CardTitle>
                <div className="text-sm text-muted-foreground">
                  For Employee: <span className="font-semibold">{createdEmployeeData.name}</span> 
                  | Employee ID: <span className="font-semibold">{createdEmployeeData.employeeId}</span>
                  | Department: <span className="font-semibold">{createdEmployeeData.department}</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="text-center border-b-2 border-black pb-4">
                    <h2 className="text-xl font-bold">New Form : 11 - Declaration Form</h2>
                    <p className="text-sm">(To be retained by the employer for future reference)</p>
                    <p className="text-xs font-semibold">EMPLOYEES' PROVIDENT FUND ORGANISATION</p>
                    <p className="text-xs">Employees' Provident Fund Scheme, 1952 (Paragraph 34 & 57) and Employees' Pension Scheme, 1995 (Paragraph 24)</p>
                    <p className="text-xs">(Declaration by a person taking up Employment in any Establishment on which EPF Scheme, 1952 and for EPS, 1995 is applicable)</p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">Auto-filled from Employee Record</h3>
                        <div className="mt-2 text-sm text-blue-700">
                          <p>Fields marked with <span className="font-semibold">(Auto-filled)</span> are automatically populated from the employee's onboarding data.</p>
                          <p className="mt-1">Please review all information before saving.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="1. Name of Member (Aadhar Name)" required>
                      <div className="relative">
                        <Input
                          value={epfFormData.memberName}
                          onChange={(e) => handleEPFFormChange('memberName', e.target.value)}
                          placeholder="Enter full name as per Aadhar"
                          className="bg-gray-50"
                        />
                        <div className="absolute right-2 top-2">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                        </div>
                      </div>
                    </FormField>

                    <FormField label="2. Father's Name / Spouse's Name">
                      <div className="relative">
                        <Input
                          value={epfFormData.fatherOrSpouseName}
                          onChange={(e) => handleEPFFormChange('fatherOrSpouseName', e.target.value)}
                          placeholder={`Enter ${epfFormData.relationshipType === 'father' ? 'father' : 'spouse'} name`}
                          className={isAutoFilledField('fatherOrSpouseName') ? "bg-gray-50" : ""}
                        />
                        {isAutoFilledField('fatherOrSpouseName') && (
                          <div className="absolute right-2 top-2">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                          </div>
                        )}
                      </div>
                    </FormField>

                    <FormField label="3. Date of Birth">
                      <div className="relative">
                        <Input
                          type="date"
                          value={epfFormData.dateOfBirth}
                          onChange={(e) => handleEPFFormChange('dateOfBirth', e.target.value)}
                          className={isAutoFilledField('dateOfBirth') ? "bg-gray-50" : ""}
                        />
                        {isAutoFilledField('dateOfBirth') && (
                          <div className="absolute right-2 top-2">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                          </div>
                        )}
                      </div>
                    </FormField>

                    <FormField label="4. Gender">
                      <div className="relative">
                        <Select value={epfFormData.gender} onValueChange={(value) => handleEPFFormChange('gender', value)}>
                          <SelectTrigger className={isAutoFilledField('gender') ? "bg-gray-50" : ""}>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Transgender">Transgender</SelectItem>
                          </SelectContent>
                        </Select>
                        {isAutoFilledField('gender') && (
                          <div className="absolute right-2 top-2">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                          </div>
                        )}
                      </div>
                    </FormField>

                    <FormField label="5. Marital Status">
                      <div className="relative">
                        <Select value={epfFormData.maritalStatus} onValueChange={(value) => handleEPFFormChange('maritalStatus', value)}>
                          <SelectTrigger className={isAutoFilledField('maritalStatus') ? "bg-gray-50" : ""}>
                            <SelectValue placeholder="Select marital status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Single">Single</SelectItem>
                            <SelectItem value="Married">Married</SelectItem>
                            <SelectItem value="Widow">Widow</SelectItem>
                            <SelectItem value="Widower">Widower</SelectItem>
                            <SelectItem value="Divorcee">Divorcee</SelectItem>
                          </SelectContent>
                        </Select>
                        {isAutoFilledField('maritalStatus') && (
                          <div className="absolute right-2 top-2">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                          </div>
                        )}
                      </div>
                    </FormField>

                    <FormField label="6. (a) Email ID">
                      <div className="relative">
                        <Input
                          type="email"
                          value={epfFormData.email}
                          onChange={(e) => handleEPFFormChange('email', e.target.value)}
                          placeholder="Enter email address"
                          className={isAutoFilledField('email') ? "bg-gray-50" : ""}
                        />
                        {isAutoFilledField('email') && (
                          <div className="absolute right-2 top-2">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                          </div>
                        )}
                      </div>
                    </FormField>

                    <FormField label="6. (b) Mobile No (Aadhar Registered)">
                      <div className="relative">
                        <Input
                          value={epfFormData.mobileNumber}
                          onChange={(e) => handleEPFFormChange('mobileNumber', e.target.value)}
                          placeholder="Enter mobile number"
                          className={isAutoFilledField('mobileNumber') ? "bg-gray-50" : ""}
                        />
                        {isAutoFilledField('mobileNumber') && (
                          <div className="absolute right-2 top-2">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                          </div>
                        )}
                      </div>
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg">
                    <div className="space-y-2">
                      <Label>7. Whether earlier member of the Employee's Provident Fund Scheme, 1952 ?</Label>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={epfFormData.previousEPFMember}
                            onChange={(e) => handleEPFFormChange('previousEPFMember', e.target.checked)}
                          />
                          <Label>Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!epfFormData.previousEPFMember}
                            onChange={(e) => handleEPFFormChange('previousEPFMember', !e.target.checked)}
                          />
                          <Label>No</Label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>8. Whether earlier member of the Employee's Pension Scheme, 1995 ?</Label>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={epfFormData.previousPensionMember}
                            onChange={(e) => handleEPFFormChange('previousPensionMember', e.target.checked)}
                          />
                          <Label>Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!epfFormData.previousPensionMember}
                            onChange={(e) => handleEPFFormChange('previousPensionMember', !e.target.checked)}
                          />
                          <Label>No</Label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 p-4 border rounded-lg">
                    <h4 className="font-semibold">9. Previous Employment details ? (If Yes, 7 & 8 details above)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField label="a) Universal Account Number (UAN)">
                        <Input
                          value={epfFormData.previousUAN}
                          onChange={(e) => handleEPFFormChange('previousUAN', e.target.value)}
                          placeholder="Enter previous UAN"
                        />
                      </FormField>
                      <FormField label="b) Previous PF Account Number">
                        <Input
                          value={epfFormData.previousPFAccountNumber}
                          onChange={(e) => handleEPFFormChange('previousPFAccountNumber', e.target.value)}
                          placeholder="Enter previous PF account number"
                        />
                      </FormField>
                      <FormField label="c) Date of Exit from previous Employment">
                        <Input
                          type="date"
                          value={epfFormData.dateOfExit}
                          onChange={(e) => handleEPFFormChange('dateOfExit', e.target.value)}
                        />
                      </FormField>
                      <FormField label="d) Scheme Certificate No (If issued)">
                        <Input
                          value={epfFormData.schemeCertificateNumber}
                          onChange={(e) => handleEPFFormChange('schemeCertificateNumber', e.target.value)}
                          placeholder="Enter scheme certificate number"
                        />
                      </FormField>
                      <FormField label="e) Pension Payment Order (PPO) (If issued)">
                        <Input
                          value={epfFormData.pensionPaymentOrder}
                          onChange={(e) => handleEPFFormChange('pensionPaymentOrder', e.target.value)}
                          placeholder="Enter PPO number"
                        />
                      </FormField>
                    </div>
                  </div>

                  <div className="space-y-4 p-4 border rounded-lg">
                    <h4 className="font-semibold">10. International Worker Details</h4>
                    <div className="space-y-2">
                      <Label>a) International Worker</Label>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={epfFormData.internationalWorker}
                            onChange={(e) => handleEPFFormChange('internationalWorker', e.target.checked)}
                          />
                          <Label>Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!epfFormData.internationalWorker}
                            onChange={(e) => handleEPFFormChange('internationalWorker', !e.target.checked)}
                          />
                          <Label>No</Label>
                        </div>
                      </div>
                    </div>

                    {epfFormData.internationalWorker && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <FormField label="b) Country of origin">
                          <Input
                            value={epfFormData.countryOfOrigin}
                            onChange={(e) => handleEPFFormChange('countryOfOrigin', e.target.value)}
                            placeholder="Enter country name"
                          />
                        </FormField>
                        <FormField label="c) Passport No.">
                          <Input
                            value={epfFormData.passportNumber}
                            onChange={(e) => handleEPFFormChange('passportNumber', e.target.value)}
                            placeholder="Enter passport number"
                          />
                        </FormField>
                        <FormField label="d) Passport Validity From">
                          <Input
                            type="date"
                            value={epfFormData.passportValidityFrom}
                            onChange={(e) => handleEPFFormChange('passportValidityFrom', e.target.value)}
                          />
                        </FormField>
                        <FormField label="d) Passport Validity To">
                          <Input
                            type="date"
                            value={epfFormData.passportValidityTo}
                            onChange={(e) => handleEPFFormChange('passportValidityTo', e.target.value)}
                          />
                        </FormField>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 p-4 border rounded-lg">
                    <h4 className="font-semibold">11. KYC Details : (attach self attested copies of following KYC's)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField label="a) Bank Account No. & IFSC Code">
                        <div className="relative">
                          <Input
                            value={epfFormData.bankAccountNumber}
                            onChange={(e) => handleEPFFormChange('bankAccountNumber', e.target.value)}
                            placeholder="Enter bank account number"
                            className={isAutoFilledField('bankAccountNumber') ? "bg-gray-50" : ""}
                          />
                          {isAutoFilledField('bankAccountNumber') && (
                            <div className="absolute right-2 top-2">
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                            </div>
                          )}
                        </div>
                      </FormField>
                      <FormField label="IFSC Code">
                        <div className="relative">
                          <Input
                            value={epfFormData.ifscCode}
                            onChange={(e) => handleEPFFormChange('ifscCode', e.target.value)}
                            placeholder="Enter IFSC code"
                            className={isAutoFilledField('ifscCode') ? "bg-gray-50" : ""}
                          />
                          {isAutoFilledField('ifscCode') && (
                            <div className="absolute right-2 top-2">
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                            </div>
                          )}
                        </div>
                      </FormField>
                      <FormField label="b) AADHAR Number" required>
                        <div className="relative">
                          <Input
                            value={epfFormData.aadharNumber}
                            onChange={(e) => handleEPFFormChange('aadharNumber', e.target.value)}
                            placeholder="Enter Aadhar number"
                            required
                            className={isAutoFilledField('aadharNumber') ? "bg-gray-50" : ""}
                          />
                          {isAutoFilledField('aadharNumber') && (
                            <div className="absolute right-2 top-2">
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                            </div>
                          )}
                        </div>
                      </FormField>
                      <FormField label="c) Permanent Account Number (PAN)">
                        <div className="relative">
                          <Input
                            value={epfFormData.panNumber}
                            onChange={(e) => handleEPFFormChange('panNumber', e.target.value)}
                            placeholder="Enter PAN number"
                            className={isAutoFilledField('panNumber') ? "bg-gray-50" : ""}
                          />
                          {isAutoFilledField('panNumber') && (
                            <div className="absolute right-2 top-2">
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                            </div>
                          )}
                        </div>
                      </FormField>
                    </div>
                  </div>

                  <div className="space-y-4 p-4 border rounded-lg">
                    <h4 className="font-semibold">12. Declaration Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>First EPF Member</Label>
                        <div className="flex gap-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={epfFormData.firstEPFMember}
                              onChange={(e) => handleEPFFormChange('firstEPFMember', e.target.checked)}
                            />
                            <Label>Yes</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!epfFormData.firstEPFMember}
                              onChange={(e) => handleEPFFormChange('firstEPFMember', !e.target.checked)}
                            />
                            <Label>No</Label>
                          </div>
                        </div>
                      </div>

                      <FormField label="Enrolled Date">
                        <div className="relative">
                          <Input
                            type="date"
                            value={epfFormData.enrolledDate}
                            onChange={(e) => handleEPFFormChange('enrolledDate', e.target.value)}
                            className={isAutoFilledField('enrolledDate') ? "bg-gray-50" : ""}
                          />
                          {isAutoFilledField('enrolledDate') && (
                            <div className="absolute right-2 top-2">
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                            </div>
                          )}
                        </div>
                      </FormField>

                      <FormField label="First Employment EPF Wages">
                        <div className="relative">
                          <Input
                            value={epfFormData.firstEmploymentWages}
                            onChange={(e) => handleEPFFormChange('firstEmploymentWages', e.target.value)}
                            placeholder="Enter wages"
                            className={isAutoFilledField('firstEmploymentWages') ? "bg-gray-50" : ""}
                          />
                          {isAutoFilledField('firstEmploymentWages') && (
                            <div className="absolute right-2 top-2">
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                            </div>
                          )}
                        </div>
                      </FormField>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                      <div className="space-y-2">
                        <Label className="text-sm">EPF Member before 01/09/2014</Label>
                        <div className="flex gap-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={epfFormData.epfMemberBeforeSep2014}
                              onChange={(e) => handleEPFFormChange('epfMemberBeforeSep2014', e.target.checked)}
                            />
                            <Label>Yes</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!epfFormData.epfMemberBeforeSep2014}
                              onChange={(e) => handleEPFFormChange('epfMemberBeforeSep2014', !e.target.checked)}
                            />
                            <Label>No</Label>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">EPF Amount Withdrawn?</Label>
                        <div className="flex gap-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={epfFormData.epfAmountWithdrawn}
                              onChange={(e) => handleEPFFormChange('epfAmountWithdrawn', e.target.checked)}
                            />
                            <Label>Yes</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!epfFormData.epfAmountWithdrawn}
                              onChange={(e) => handleEPFFormChange('epfAmountWithdrawn', !e.target.checked)}
                            />
                            <Label>No</Label>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">EPS Amount Withdrawn?</Label>
                        <div className="flex gap-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={epfFormData.epsAmountWithdrawn}
                              onChange={(e) => handleEPFFormChange('epsAmountWithdrawn', e.target.checked)}
                            />
                            <Label>Yes</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!epfFormData.epsAmountWithdrawn}
                              onChange={(e) => handleEPFFormChange('epsAmountWithdrawn', !e.target.checked)}
                            />
                            <Label>No</Label>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">EPS Amount Withdrawn after Sep 2014?</Label>
                        <div className="flex gap-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={epfFormData.epsAmountWithdrawnAfterSep2014}
                              onChange={(e) => handleEPFFormChange('epsAmountWithdrawnAfterSep2014', e.target.checked)}
                            />
                            <Label>Yes</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!epfFormData.epsAmountWithdrawnAfterSep2014}
                              onChange={(e) => handleEPFFormChange('epsAmountWithdrawnAfterSep2014', !e.target.checked)}
                            />
                            <Label>No</Label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg bg-gray-50">
                    <h4 className="font-semibold mb-2">UNDERTAKING</h4>
                    <p className="text-sm">1) Certified that the particulars are true to the best of my knowledge</p>
                    <p className="text-sm">2) I authorise EPFO to use my Aadhar for verification / authentication / eKYC purpose for service delivery</p>
                    <p className="text-sm">3) Kindly transfer the fund and service details, if applicable, from the previous PF account as declared above to the present PF account.</p>
                    <p className="text-sm">(The transfer would be possible only if the identified KYC details approved by previous employer has been verified by present employer using his Digital Signature</p>
                    <p className="text-sm">4) In case of changes in above details, the same will be intimated to employer at the earliest.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg">
                    <div className="space-y-4">
                      <h4 className="font-semibold">Employee Declaration</h4>
                      <FormField label="Date">
                        <Input
                          type="date"
                          value={epfFormData.declarationDate}
                          onChange={(e) => handleEPFFormChange('declarationDate', e.target.value)}
                        />
                      </FormField>
                      <FormField label="Place">
                        <Input
                          value={epfFormData.declarationPlace}
                          onChange={(e) => handleEPFFormChange('declarationPlace', e.target.value)}
                          placeholder="Enter place"
                        />
                      </FormField>
                      <FormField label="Signature of Member">
                        <div className="border-2 border-dashed rounded-lg p-4 text-center h-20 flex items-center justify-center">
                          <span className="text-muted-foreground">Employee Signature</span>
                        </div>
                      </FormField>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold">Employer Declaration</h4>
                      <FormField label="Date">
                        <Input
                          type="date"
                          value={epfFormData.employerDeclarationDate}
                          onChange={(e) => handleEPFFormChange('employerDeclarationDate', e.target.value)}
                        />
                      </FormField>
                      <FormField label="Signature of Employer with Seal">
                        <div className="border-2 border-dashed rounded-lg p-4 text-center h-20 flex items-center justify-center">
                          <span className="text-muted-foreground">Employer Signature & Seal</span>
                        </div>
                      </FormField>
                    </div>
                  </div>

                  <div className="flex gap-4 justify-between pt-4 border-t">
                    <div className="flex gap-4">
                      <Button onClick={handleSaveEPFForm} className="flex items-center gap-2">
                        <Save className="h-4 w-4" />
                        Save EPF Form
                      </Button>
                      <Button onClick={handlePrintEPFForm} variant="outline" className="flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        Print Form
                      </Button>
                    </div>
                    <Button variant="outline" onClick={() => setActiveTab("onboarding")}>
                      Back to Onboarding
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Employee Selected</h3>
                  <p className="text-muted-foreground mb-6">
                    Please create an employee first to fill the EPF Form 11.
                  </p>
                  <Button onClick={() => setActiveTab("onboarding")}>
                    Go to Onboarding
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OnboardingTab;