
import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, Loader2, ArrowLeft, FilePlus, Upload, Info } from 'lucide-react';
import { LoanRequest } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { useDataContext } from '../contexts/DataContext';
import { InputField, SelectField, FileUploadField } from './FormFields';
import SignaturePad, { SignaturePadRef } from './SignaturePad';
import { getContractText } from '../services/pdfService';
import { DNI_FRONT_PLACEHOLDER, DNI_BACK_PLACEHOLDER } from '../constants';
import { compressImage } from '../services/utils';

const initialFormData = {
    fullName: '', idNumber: '', address: '', phone: '', email: '',
    loanAmount: '1000', loanReason: '', employmentStatus: '', contractType: '',
};

const LoanRequestForm: React.FC = () => {
    const { handleLoanRequestSubmit } = useDataContext();
    const { showToast } = useAppContext();
    
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState(initialFormData);
    const [frontId, setFrontId] = useState<File | null>(null);
    const [backId, setBackId] = useState<File | null>(null);
    const [frontIdPreview, setFrontIdPreview] = useState<string | null>(null);
    const [backIdPreview, setBackIdPreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [signatureError, setSignatureError] = useState(false);
    const [contractPreview, setContractPreview] = useState('');
    const signaturePadRef = useRef<SignaturePadRef>(null);

    // Update contract preview in real-time
    useEffect(() => {
        if (step === 2) {
            const previewText = getContractText({
                fullName: formData.fullName || '[Nombre Completo]',
                idNumber: formData.idNumber || '[DNI / NIE]',
                address: formData.address || '[Dirección]',
                loanAmount: parseFloat(formData.loanAmount) || 0,
            });
            setContractPreview(previewText);
        }
    }, [step, formData.fullName, formData.idNumber, formData.address, formData.loanAmount]);

    // Separate useEffect hooks to correctly manage the lifecycle of each object URL.
    useEffect(() => {
        return () => {
            if (frontIdPreview) URL.revokeObjectURL(frontIdPreview);
        };
    }, [frontIdPreview]);

    useEffect(() => {
        return () => {
            if (backIdPreview) URL.revokeObjectURL(backIdPreview);
        };
    }, [backIdPreview]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'back') => {
        const file = e.target.files?.[0];
        if (file) {
            const newPreviewUrl = URL.createObjectURL(file);
            if (type === 'front') {
                setFrontId(file);
                setFrontIdPreview(newPreviewUrl);
            } else {
                setBackId(file);
                setBackIdPreview(newPreviewUrl);
            }
        }
    };

    const handleNextStep = (e: React.FormEvent) => {
        e.preventDefault();
        if (!frontId || !backId) {
            showToast('Por favor, toma una captura o sube ambas imágenes del documento (DNI o NIE).', 'error');
            return;
        }
        setStep(2);
    };

    const handleSubmit = async () => {
        if (!frontId || !backId) {
            showToast('Faltan las imágenes del documento.', 'error');
            return;
        }
        const signatureImage = signaturePadRef.current?.toDataURL();
        if (!signatureImage) {
            showToast('Por favor, firma el contrato para continuar.', 'error');
            setSignatureError(true);
            return;
        }
        setSignatureError(false);
        setIsSubmitting(true);
        try {
            // Comprimir imágenes antes de enviar
            const frontIdBase64 = await compressImage(frontId);
            const backIdBase64 = await compressImage(backId);

            const { contractType, ...restData } = formData;
            const submissionData: Omit<LoanRequest, 'id' | 'requestDate' | 'status' | 'frontIdUrl' | 'backIdUrl'> = {
                ...restData,
                loanAmount: parseFloat(formData.loanAmount) || 0,
                signature: signatureImage,
            };

            if (formData.employmentStatus === 'Empleado') {
                (submissionData as any).contractType = contractType;
            }
            
            // Enviamos los strings base64 en lugar de los objetos File
            await handleLoanRequestSubmit(submissionData, { frontId: frontIdBase64, backId: backIdBase64 });
            setIsSubmitted(true);
            const audio = document.getElementById('success-sound') as HTMLAudioElement;
            if (audio) {
                audio.play().catch(e => console.warn("Could not play success sound:", e));
            }
        } catch (error) {
            console.error("Error processing form:", error);
            showToast('Error al enviar la solicitud. Inténtalo de nuevo.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const resetForm = () => {
        setFormData(initialFormData);
        setFrontId(null);
        setBackId(null);
        setFrontIdPreview(null);
        setBackIdPreview(null);
        setSignatureError(false);
        signaturePadRef.current?.clear();
        setStep(1);
        setIsSubmitted(false);
    };

    if (isSubmitted) {
        return (
            <div className="max-w-2xl mx-auto text-center py-16">
                 <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
                 <h1 className="mt-4 text-3xl font-bold text-slate-100">¡Solicitud Enviada!</h1>
                 <p className="mt-2 text-slate-300">
                    Gracias por tu confianza. Tu solicitud ha sido registrada correctamente y nuestro equipo la revisará a la brevedad.
                 </p>
                 <div className="mt-8 flex justify-center">
                    <button 
                        onClick={resetForm} 
                        className="inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white font-bold rounded-lg shadow-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-transform hover:scale-105"
                    >
                        <FilePlus className="mr-2 h-5 w-5" />
                        Realizar otra solicitud
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-2">Iniciar una Solicitud</h1>
            <p className="text-slate-400 mb-6">
                Paso {step} de 2: {step === 1 ? "Tus datos y documentación" : "Aceptación del Contrato"}
            </p>
            {step === 1 && (
                 <form onSubmit={handleNextStep} className="bg-slate-800 p-4 sm:p-8 rounded-xl shadow-lg space-y-8 border border-slate-700">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-200 mb-4 border-b border-slate-700 pb-2 flex items-center gap-2">
                             Información Personal
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputField label="Nombre Completo" name="fullName" type="text" value={formData.fullName} onChange={handleInputChange} required />
                            <InputField label="DNI / NIE" name="idNumber" type="text" value={formData.idNumber} onChange={handleInputChange} required />
                            <InputField label="Dirección Completa" name="address" type="text" value={formData.address} onChange={handleInputChange} required />
                            <InputField label="Teléfono de Contacto" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} required />
                            <div className="md:col-span-2"> <InputField label="Email (opcional)" name="email" type="email" value={formData.email} onChange={handleInputChange} isOptional /> </div>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-slate-200 mb-4 border-b border-slate-700 pb-2">Identificación Oficial</h2>
                        <div className="mb-4 flex items-start gap-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg text-blue-300 text-sm">
                            <Info className="flex-shrink-0 h-5 w-5 mt-0.5" />
                            <p>Para procesar tu solicitud, necesitamos una imagen clara de tu <strong>DNI o NIE</strong>. Puedes tomar una foto directamente con tu móvil.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FileUploadField label="Anverso del Documento (Frontal)" id="front-id-upload" onChange={(e) => handleFileChange(e, 'front')} previewUrl={frontIdPreview} fileName={frontId?.name} />
                            <FileUploadField label="Reverso del Documento (Trasero)" id="back-id-upload" onChange={(e) => handleFileChange(e, 'back')} previewUrl={backIdPreview} fileName={backId?.name} />
                        </div>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-slate-200 mb-4 border-b border-slate-700 pb-2">Detalles Económicos</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2"><InputField label="Monto Solicitado (€)" name="loanAmount" type="number" value={formData.loanAmount} onChange={handleInputChange} required min="1" /></div>
                            <SelectField label="Motivo del Préstamo" name="loanReason" value={formData.loanReason} onChange={handleInputChange} required>
                                <option value="">Selecciona un motivo...</option>
                                <option value="Inversión Negocio">Inversión en Negocio</option> <option value="Consolidación Deuda">Consolidación de Deuda</option> <option value="Gastos Médicos">Gastos Médicos</option>
                                <option value="Educación">Educación</option> <option value="Mejoras Hogar">Mejoras del Hogar</option> <option value="Otro">Otro</option>
                            </SelectField>
                            <SelectField label="Situación Laboral" name="employmentStatus" value={formData.employmentStatus} onChange={handleInputChange} required>
                                <option value="">Selecciona una situación...</option>
                                <option value="Empleado">Empleado/a</option> <option value="Autónomo">Autónomo/a</option> <option value="Estudiante">Estudiante</option> <option value="Desempleado">Desempleado/a</option>
                            </SelectField>
                            {formData.employmentStatus === 'Empleado' && (<SelectField label="Tipo de Contrato" name="contractType" value={formData.contractType} onChange={handleInputChange} required>
                                <option value="">Selecciona un tipo...</option>
                                <option value="Indefinido">Indefinido</option> <option value="Temporal">Temporal</option> <option value="Obra y Servicio">Por Obra y Servicio</option>
                            </SelectField>)}
                        </div>
                    </div>

                     <div className="text-right">
                         <button type="submit" className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-primary-600 text-white font-bold rounded-xl shadow-lg hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-500/50 transition-all transform hover:scale-[1.02]">
                             Continuar y Firmar Contrato
                         </button>
                    </div>
                </form>
            )}

            {step === 2 && (
                <div className="bg-slate-800 p-4 sm:p-8 rounded-xl shadow-lg space-y-6 border border-slate-700">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-200 mb-2">Revisión del Contrato Legal</h2>
                        <div className="w-full h-80 overflow-y-auto p-4 border border-slate-600 rounded-md bg-slate-900/50 text-sm whitespace-pre-wrap font-mono text-slate-300 leading-relaxed">
                            {contractPreview}
                        </div>
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-200 mb-2">Tu Firma Digital</h2>
                        <p className="text-sm text-slate-400 mb-3">Dibuja tu firma en el recuadro inferior. Al firmar, confirmas la veracidad de los datos y aceptas los términos legales.</p>
                        <div className={`p-1 rounded-lg border-2 ${signatureError ? 'border-red-500 bg-red-500/5' : 'border-transparent'}`}>
                             <SignaturePad ref={signaturePadRef} onDrawEnd={() => setSignatureError(false)} />
                        </div>
                        {signatureError && <p className="text-red-500 text-sm mt-1 font-bold animate-pulse">La firma es obligatoria para validar el contrato.</p>}
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-700">
                        <button onClick={() => setStep(1)} className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-slate-600 text-slate-100 font-bold rounded-lg hover:bg-slate-700 transition-colors">
                            <ArrowLeft className="mr-2 h-5 w-5" />
                            Modificar Datos
                        </button>
                        <button onClick={handleSubmit} disabled={isSubmitting} className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-transform hover:scale-105 disabled:bg-green-400">
                             {isSubmitting ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Procesando Solicitud...</>) : (<><Upload className="mr-2 h-5 w-5" /> Enviar y Finalizar</>)}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoanRequestForm;
