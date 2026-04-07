import { useRef, forwardRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import CompanyLogo from './common/CompanyLogo';
import FormHeader from './common/FormHeader';

// Printable form component
const PrintableForm = forwardRef(({ submission, schema }, ref) => {
    if (!submission || !schema) return null;

    return (
        <div ref={ref} className="print-container" style={{ padding: '20px' }}>
            <FormHeader
                formName={schema.formName}
                modelNo={submission.headerData?.modelNo || submission.drone?.modelNo}
                serialNo={submission.headerData?.serialNo || submission.drone?.serialNo}
                issueNo={submission.headerData?.issueNo}
                date={new Date(submission.createdAt).toLocaleDateString()}
            />

            {/* Header Data Table */}
            <table className="print-table">
                <tbody>
                    <tr>
                        {schema.headerFields?.slice(0, 3).map((field) => (
                            <td key={field.name}>
                                <strong>{field.label}:</strong> {submission.headerData?.[field.name] || '-'}
                            </td>
                        ))}
                    </tr>
                    {schema.headerFields?.length > 3 && (
                        <tr>
                            {schema.headerFields?.slice(3, 6).map((field) => (
                                <td key={field.name}>
                                    <strong>{field.label}:</strong> {submission.headerData?.[field.name] || '-'}
                                </td>
                            ))}
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Form Sections */}
            {schema.sections?.map((section, sIdx) => (
                <div key={sIdx} style={{ marginTop: '20px' }}>
                    <h3 style={{ borderBottom: '2px solid #000', paddingBottom: '4px', marginBottom: '12px' }}>
                        {section.title}
                    </h3>

                    <table className="print-table">
                        <thead>
                            <tr>
                                <th>SR. NO</th>
                                <th>PARAMETERS</th>
                                <th>Approved (YES/NO)</th>
                                <th>REMARK</th>
                            </tr>
                        </thead>
                        <tbody>
                            {section.fields?.map((field, fIdx) => (
                                <tr key={field.name}>
                                    <td style={{ textAlign: 'center' }}>{fIdx + 1}</td>
                                    <td>{field.label}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        {submission.formData?.[field.name] ||
                                            submission.formData?.[`${field.name}_approved`] || '-'}
                                    </td>
                                    <td>
                                        {submission.formData?.[`${field.name}_remark`] || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}

            {/* Footer / Signatures */}
            <div className="print-signature">
                {schema.footerFields?.map((field) => (
                    <div key={field.name} className="signature-block">
                        <div style={{ minHeight: '60px' }}>
                            {submission.footerData?.[field.name] || ''}
                        </div>
                        <div className="signature-line">{field.label}</div>
                    </div>
                ))}
            </div>

            {/* Form Metadata */}
            <div style={{
                marginTop: '40px',
                paddingTop: '20px',
                borderTop: '1px solid #e0e0e0',
                fontSize: '0.75rem',
                color: '#666'
            }}>
                <p>Form Code: {schema.formCode}</p>
                <p>Submitted: {new Date(submission.createdAt).toLocaleString()}</p>
                <p>Submitted By: {submission.submittedBy?.name || 'Unknown'}</p>
                {submission.drone && <p>Drone S/N: {submission.drone.serialNo}</p>}
            </div>
        </div>
    );
});

PrintableForm.displayName = 'PrintableForm';

// Form Printer Component
const FormPrinter = ({ submission, schema, trigger }) => {
    const componentRef = useRef(null);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `${schema?.formName || 'Form'} - ${submission?.drone?.serialNo || 'Print'}`,
    });

    return (
        <>
            {/* Trigger button that calls handlePrint */}
            {trigger ? (
                <span onClick={handlePrint}>{trigger}</span>
            ) : (
                <button onClick={handlePrint} className="btn btn-primary">
                    🖨️ Print Form
                </button>
            )}

            {/* Hidden printable content */}
            <div style={{ display: 'none' }}>
                <PrintableForm ref={componentRef} submission={submission} schema={schema} />
            </div>
        </>
    );
};

export default FormPrinter;
export { PrintableForm };
