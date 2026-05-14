export function formFactory<const T extends readonly string[]>(fieldNames: T) {
    type FieldName = T[number];
    type Elements = HTMLFormControlsCollection & Record<FieldName, HTMLInputElement>;
    type Form = HTMLFormElement & { readonly elements: Elements };

    const fields = Object.fromEntries(fieldNames.map((n) => [n, n])) as {
        [K in FieldName]: K;
    };

    return {
        fields,
        setFieldError: (form: Form, name: FieldName, message: string): void => {
            form.elements[name].setCustomValidity(message);
            form.reportValidity();
        },
        clearErrors: (form: Form): void => {
            for (const el of form.elements) {
                if (el instanceof HTMLInputElement) el.setCustomValidity('');
            }
        },
        types: undefined as unknown as { FieldName: FieldName; Form: Form },
    };
}
