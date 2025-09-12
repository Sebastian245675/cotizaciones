import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from '@/hooks/use-toast';
import { TestTube, Plus } from 'lucide-react';

const CreateTestQuote: React.FC = () => {
  const createTestForm = async () => {
    try {
      // Crear formulario de prueba
      const testForm = {
        name: "Cotización de Servicios Web",
        description: "Formulario para cotizar servicios de desarrollo web y marketing digital",
        fields: [
          {
            id: "1",
            label: "Nombre Completo",
            type: "text",
            required: true,
            placeholder: "Ingrese su nombre completo",
            order: 0
          },
          {
            id: "2",
            label: "Email",
            type: "email",
            required: true,
            placeholder: "su-email@ejemplo.com",
            order: 1
          },
          {
            id: "3",
            label: "Teléfono",
            type: "phone",
            required: true,
            placeholder: "+54 11 1234-5678",
            order: 2
          },
          {
            id: "4",
            label: "Empresa",
            type: "text",
            required: false,
            placeholder: "Nombre de su empresa (opcional)",
            order: 3
          },
          {
            id: "5",
            label: "Tipo de Servicio",
            type: "select",
            required: true,
            options: ["Desarrollo Web", "E-commerce", "Marketing Digital", "Diseño Gráfico", "Consultoría"],
            order: 4
          },
          {
            id: "6",
            label: "Presupuesto Estimado",
            type: "select",
            required: true,
            options: ["Menos de $500", "$500 - $1,000", "$1,000 - $5,000", "$5,000 - $10,000", "Más de $10,000"],
            order: 5
          },
          {
            id: "7",
            label: "Descripción del Proyecto",
            type: "textarea",
            required: true,
            placeholder: "Describa detalladamente lo que necesita...",
            order: 6
          },
          {
            id: "8",
            label: "Fecha Estimada de Inicio",
            type: "date",
            required: false,
            order: 7
          }
        ],
        active: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const formDoc = await addDoc(collection(db, 'quoteForms'), testForm);
      
      // Crear cotización de prueba
      const testSubmission = {
        formId: formDoc.id,
        formName: "Cotización de Servicios Web",
        data: {
          "nombreCompleto": "Juan Carlos Pérez",
          "email": "juan.perez@empresaejemplo.com",
          "telefono": "+54 11 4567-8901",
          "empresa": "Empresa Ejemplo S.A.",
          "tipoDeServicio": "E-commerce",
          "presupuestoEstimado": "$5,000 - $10,000",
          "descripcionDelProyecto": "Necesitamos desarrollar una tienda online completa para venta de productos artesanales. El proyecto incluye catálogo de productos, carrito de compras, sistema de pagos con Mercado Pago, gestión de inventario y panel administrativo. También requerimos integración con redes sociales y optimización SEO.",
          "fechaEstimadaDeInicio": "2025-10-01"
        },
        status: "pending",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        customerEmail: "juan.perez@empresaejemplo.com",
        customerPhone: "+54 11 4567-8901",
        notes: "Cliente interesado en comenzar el proyecto lo antes posible. Tiene experiencia previa con e-commerce básico pero busca una solución más robusta."
      };

      await addDoc(collection(db, 'quoteSubmissions'), testSubmission);

      toast({
        title: "Datos de prueba creados",
        description: "Se ha creado un formulario y una cotización de prueba exitosamente"
      });

    } catch (error) {
      console.error('Error creating test data:', error);
      toast({
        title: "Error",
        description: "No se pudieron crear los datos de prueba",
        variant: "destructive"
      });
    }
  };

  const createAdditionalTestSubmissions = async () => {
    try {
      const additionalSubmissions = [
        {
          formId: "test-form-id",
          formName: "Cotización de Servicios Web",
          data: {
            "nombreCompleto": "María González",
            "email": "maria.gonzalez@startup.com",
            "telefono": "+54 11 9876-5432",
            "empresa": "StartupTech",
            "tipoDeServicio": "Desarrollo Web",
            "presupuestoEstimado": "$1,000 - $5,000",
            "descripcionDelProyecto": "Página web corporativa moderna y responsive con sección de servicios, equipo, blog y contacto. Necesitamos también hosting y dominio.",
            "fechaEstimadaDeInicio": "2025-09-15"
          },
          status: "reviewed",
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          customerEmail: "maria.gonzalez@startup.com",
          customerPhone: "+54 11 9876-5432",
          notes: "Cliente muy organizado, tiene definidos todos los requerimientos. Presupuesto flexible."
        },
        {
          formId: "test-form-id",
          formName: "Cotización de Servicios Web",
          data: {
            "nombreCompleto": "Roberto Silva",
            "email": "roberto@restauranteelasado.com",
            "telefono": "+54 11 2345-6789",
            "empresa": "Restaurante El Asado",
            "tipoDeServicio": "Marketing Digital",
            "presupuestoEstimado": "$500 - $1,000",
            "descripcionDelProyecto": "Campaña de marketing digital para restaurante: gestión de redes sociales, publicidad en Facebook e Instagram, diseño de menú digital y sistema de pedidos online.",
            "fechaEstimadaDeInicio": "2025-09-20"
          },
          status: "responded",
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          customerEmail: "roberto@restauranteelasado.com",
          customerPhone: "+54 11 2345-6789",
          notes: "Propuesta enviada por email. Cliente interesado en paquete mensual de marketing."
        }
      ];

      for (const submission of additionalSubmissions) {
        await addDoc(collection(db, 'quoteSubmissions'), submission);
      }

      toast({
        title: "Cotizaciones adicionales creadas",
        description: "Se han agregado más cotizaciones de prueba con diferentes estados"
      });

    } catch (error) {
      console.error('Error creating additional test submissions:', error);
      toast({
        title: "Error",
        description: "No se pudieron crear las cotizaciones adicionales",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5 text-green-600" />
          Crear Datos de Prueba
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          Utiliza estos botones para crear formularios y cotizaciones de prueba para probar las funcionalidades de exportación.
        </p>
        
        <div className="flex flex-col gap-3">
          <Button onClick={createTestForm} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Crear Formulario y Cotización Completa
          </Button>
          
          <Button onClick={createAdditionalTestSubmissions} variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Cotizaciones Adicionales
          </Button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <h4 className="font-medium text-blue-900 mb-2">Lo que se creará:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Formulario "Cotización de Servicios Web" con 8 campos</li>
            <li>• Cotización de "Juan Carlos Pérez" para e-commerce</li>
            <li>• Cotizaciones adicionales con diferentes estados</li>
            <li>• Datos realistas para probar exportaciones</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default CreateTestQuote;
