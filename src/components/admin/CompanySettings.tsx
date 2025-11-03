import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Building, Save, Edit } from 'lucide-react';

interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  sub?: string;
  logo?: string;
}

interface CompanySettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (companyInfo: CompanyInfo) => void;
  initialData?: CompanyInfo;
}

const CompanySettings: React.FC<CompanySettingsProps> = ({
  open,
  onOpenChange,
  onSave,
  initialData
}) => {
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [sub, setSub] = useState('');

  useEffect(() => {
    if (initialData) {
      setCompanyName(initialData.name);
      setAddress(initialData.address);
      setPhone(initialData.phone);
      setEmail(initialData.email);
      setWebsite(initialData.website || '');
      setSub(initialData.sub || '');
    }
  }, [initialData]);

  const handleSave = () => {
    if (!companyName.trim() || !address.trim() || !phone.trim() || !email.trim() || !sub.trim()) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive"
      });
      return;
    }

    const companyInfo: CompanyInfo = {
      name: companyName.trim(),
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim(),
      website: website.trim() || undefined,
      sub: sub.trim() || undefined
    };

    onSave(companyInfo);
    toast({
      title: "Configuración guardada",
      description: "La información de la empresa ha sido actualizada"
    });
    onOpenChange(false);
  };

  const resetForm = () => {
    if (initialData) {
      setCompanyName(initialData.name);
      setAddress(initialData.address);
      setPhone(initialData.phone);
      setEmail(initialData.email);
      setWebsite(initialData.website || '');
      setSub(initialData.sub || '');
    } else {
      setCompanyName('');
      setAddress('');
      setPhone('');
      setEmail('');
      setWebsite('');
      setSub('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-blue-600" />
            Configuración de la Empresa
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-2">
            Esta información aparecerá en todos los PDFs de cotización. 
            Puedes cambiarla cuantas veces necesites para trabajar con diferentes razones sociales.
          </p>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="companyName">
                Nombre de la Empresa *
              </Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ej: Mi Empresa S.A."
                required
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="address">
                Dirección *
              </Label>
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Calle Principal 123, Ciudad, País"
                rows={2}
                required
              />
            </div>

            <div>
              <Label htmlFor="phone">
                Teléfono *
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contacto@miempresa.com"
                required
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="website">
                Sitio Web (opcional)
              </Label>
              <Input
                id="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="www.miempresa.com"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="sub">
                Sub *
              </Label>
              <Input
                id="sub"
                value={sub}
                onChange={(e) => setSub(e.target.value)}
                placeholder="Maquinados Industriales de Precisión"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Este texto aparecerá debajo del nombre de la empresa en todos los PDFs
              </p>
            </div>
          </div>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Building className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">
                    Vista previa
                  </h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <div className="font-semibold">{companyName || 'Nombre de la empresa'}</div>
                    <div>{address || 'Dirección de la empresa'}</div>
                    <div>Tel: {phone || 'Teléfono'} | Email: {email || 'Email'}</div>
                    {website && <div>Web: {website}</div>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => {
            resetForm();
            onOpenChange(false);
          }}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Guardar Configuración
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CompanySettings;
