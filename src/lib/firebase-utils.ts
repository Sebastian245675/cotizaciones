/**
 * Utilidades para Firebase y limpieza de datos
 */

/**
 * Limpia un objeto removiendo propiedades con valores undefined, null o vacíos
 * @param obj - Objeto a limpiar
 * @param removeEmpty - Si true, también remueve strings vacíos y arrays vacíos
 * @returns Objeto limpio sin propiedades undefined
 */
export const cleanFirestoreData = (obj: any, removeEmpty = false): any => {
  if (obj === null || obj === undefined) {
    return null;
  }

  if (Array.isArray(obj)) {
    const cleanArray = obj
      .map(item => cleanFirestoreData(item, removeEmpty))
      .filter(item => item !== null && item !== undefined);
    
    return removeEmpty && cleanArray.length === 0 ? undefined : cleanArray;
  }

  if (typeof obj === 'object' && obj !== null) {
    const cleanObj: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined || value === null) {
        continue; // Skip undefined and null values
      }

      if (removeEmpty) {
        if (value === '' || (Array.isArray(value) && value.length === 0)) {
          continue; // Skip empty strings and arrays if removeEmpty is true
        }
      }

      const cleanValue = cleanFirestoreData(value, removeEmpty);
      if (cleanValue !== undefined && cleanValue !== null) {
        cleanObj[key] = cleanValue;
      }
    }

    return Object.keys(cleanObj).length === 0 ? undefined : cleanObj;
  }

  // For primitive values, return as-is unless they're empty and removeEmpty is true
  if (removeEmpty && obj === '') {
    return undefined;
  }

  return obj;
};

/**
 * Valida que un objeto no contenga valores undefined antes de enviarlo a Firestore
 * @param obj - Objeto a validar
 * @param path - Ruta actual en el objeto (para debugging)
 * @returns Array de paths con valores undefined
 */
export const validateFirestoreData = (obj: any, path = ''): string[] => {
  const undefinedPaths: string[] = [];

  if (obj === undefined) {
    undefinedPaths.push(path || 'root');
    return undefinedPaths;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      const itemPath = `${path}[${index}]`;
      undefinedPaths.push(...validateFirestoreData(item, itemPath));
    });
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      const valuePath = path ? `${path}.${key}` : key;
      undefinedPaths.push(...validateFirestoreData(value, valuePath));
    }
  }

  return undefinedPaths;
};

/**
 * Prepara datos de formulario de cotización para Firebase
 * @param formFields - Campos del formulario
 * @param formData - Datos ingresados por el usuario
 * @returns Datos limpios listos para Firebase
 */
export const prepareQuoteSubmissionData = (
  formFields: Array<{ id: string; label: string; type: string }>,
  formData: Record<string, any>
) => {
  const submissionData: Record<string, any> = {};
  let customerEmail = '';
  let customerPhone = '';

  formFields.forEach(field => {
    const value = formData[field.id];
    
    // Solo incluir valores que no sean undefined, null o strings vacíos
    if (value !== undefined && value !== null && value !== '') {
      submissionData[field.label] = typeof value === 'string' ? value.trim() : value;

      // Extraer email y teléfono automáticamente
      if (field.type === 'email' && typeof value === 'string' && value.trim()) {
        customerEmail = value.trim();
      }
      if (field.type === 'phone' && typeof value === 'string' && value.trim()) {
        customerPhone = value.trim();
      }
    }
  });

  return {
    submissionData,
    customerEmail: customerEmail || undefined,
    customerPhone: customerPhone || undefined
  };
};

/**
 * Prepara campos de formulario para Firebase
 * @param fields - Campos del formulario
 * @returns Campos limpios listos para Firebase
 */
export const prepareQuoteFormFields = (fields: any[]) => {
  return fields.map((field, index) => {
    const cleanField: any = {
      id: field.id,
      label: field.label,
      type: field.type,
      required: field.required,
      order: index
    };

    // Solo agregar placeholder si existe y no está vacío
    if (field.placeholder && typeof field.placeholder === 'string' && field.placeholder.trim()) {
      cleanField.placeholder = field.placeholder.trim();
    }

    // Solo agregar options para campos de tipo select con opciones válidas
    if (field.type === 'select' && Array.isArray(field.options)) {
      const validOptions = field.options
        .filter(opt => opt && typeof opt === 'string' && opt.trim() !== '')
        .map(opt => opt.trim());
      
      if (validOptions.length > 0) {
        cleanField.options = validOptions;
      }
    }

    return cleanField;
  });
};

/**
 * Verifica si un objeto está listo para ser enviado a Firebase
 * @param obj - Objeto a verificar
 * @returns true si es seguro enviar a Firebase
 */
export const isFirestoreReady = (obj: any): boolean => {
  const undefinedPaths = validateFirestoreData(obj);
  if (undefinedPaths.length > 0) {
    console.warn('Object contains undefined values at:', undefinedPaths);
    return false;
  }
  return true;
};

export default {
  cleanFirestoreData,
  validateFirestoreData,
  prepareQuoteSubmissionData,
  prepareQuoteFormFields,
  isFirestoreReady
};
