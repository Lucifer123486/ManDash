import CompanyLogo from './CompanyLogo';
import { formatSerialNo } from '../../utils/serialFormatter';

/**
 * Standardized Header for all forms, mimicking the Manufacturing Process Record style.
 */
const FormHeader = ({
    formName,
    modelNo,
    serialNo,
    docRef = 'CS_KRISHI_13',
    versionNo = '1',
    date = new Date().toLocaleDateString(),
    issueNo = '',
    issueDate = '04/03/2023',
    time = '',
    showTime = false,
    hideTable = false, // when true, only shows logo + title, no metadata table
    variant = 'rich' // 'rich' (default), 'plain' (no logo), 'qa' (new layout)
}) => {
    const styles = {
        headerLogoArea: {
            display: 'flex',
            alignItems: 'center',
            marginBottom: '24px',
            fontFamily: "Arial, sans-serif",
        },
        headerTextArea: {
            flex: 1,
            textAlign: 'center',
            paddingRight: '62px' // Offset logo width to truly center
        },
        mainTitle: {
            fontSize: '36px',
            fontWeight: 'bold',
            fontFamily: "'Times New Roman', Times, Georgia, serif",
            textTransform: 'uppercase',
            margin: 0,
            letterSpacing: '0.5px',
            color: '#000'
        },
        logoSubText: {
            fontSize: '10px',
            fontFamily: "'Times New Roman', Times, Georgia, serif",
            marginTop: '3px',
            textAlign: 'center',
            fontWeight: 'normal',
            color: '#000'
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '0',
            fontFamily: "'Times New Roman', Times, serif",
            color: '#000'
        },
        th: {
            border: '1px solid black',
            padding: '6px 4px',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '9px',
            background: '#fff'
        },
        td: {
            border: '1px solid black',
            padding: '4px 6px',
            textAlign: 'left',
            verticalAlign: 'middle',
            fontSize: '9px'
        },
        tdCenter: {
            border: '1px solid black',
            padding: '4px 6px',
            textAlign: 'center',
            verticalAlign: 'middle',
            fontSize: '9px'
        },
        sectionHeader: {
            textAlign: 'center',
            fontWeight: 'bold',
            padding: '6px',
            border: '1px solid black',
            borderBottom: 'none',
            fontSize: '10px',
            textTransform: 'uppercase',
            fontFamily: "'Times New Roman', Times, serif",
            color: '#000'
        }
    };

    const isQA = variant === 'qa';

    return (
        <div style={{ marginBottom: '24px' }}>
            {/* Standardized Branding Header - Matches Reference Image 1 (Expansive Layout) */}
            {variant !== 'plain' && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: isQA ? '10px' : '20px',
                    width: 'calc(100% + 40px)', // Wider than table
                    marginLeft: '-20px', // Pull left to overflow padding
                    marginRight: '-20px', // Pull right to overflow padding
                    fontFamily: "Arial, sans-serif"
                }}>
                    {/* Logo Column on the left - Centered Branding area */}
                    <div style={{ width: '150px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-block' }}>
                            <CompanyLogo size={75} theme="light" />
                            <div style={{
                                fontSize: '11px',
                                fontWeight: 'bold',
                                marginTop: '1px',
                                fontFamily: "'Times New Roman', Times, serif",
                                lineHeight: '1',
                                textAlign: 'center',
                                color: '#000'
                            }}>
                                CerebroSpark
                            </div>
                        </div>
                    </div>

                    {/* Centered Company Title Column - Perfect Centering relative to Header Width */}
                    <div style={{ flex: 1, textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <h1 style={{
                            fontSize: '28px',
                            fontWeight: 'bold',
                            margin: 0,
                            letterSpacing: '1px',
                            fontFamily: "'Times New Roman', Times, serif",
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                            color: '#000'
                        }}>
                            CEREBROSPARK INNOVATIONS
                        </h1>
                    </div>

                    {/* Spacer Column to ensure perfect centering of the title */}
                    <div style={{ width: '150px' }}></div>
                </div>
            )}

            {/* FORM TITLE LABEL */}
            {!isQA && (
                hideTable ? (
                    /* MRF style: centered bordered box with mixed-case title */
                    <div style={{ textAlign: 'center', margin: '12px 0 8px 0' }}>
                        <div style={{
                            display: 'inline-block',
                            border: '2px solid #000',
                            padding: '6px 28px',
                            fontWeight: 'bold',
                            fontSize: '13px',
                            fontFamily: "'Times New Roman', Times, serif",
                            color: '#000',
                            letterSpacing: '0.5px'
                        }}>
                            {formName || 'Material Requisition'}
                        </div>
                    </div>
                ) : (
                    /* Standard style: full-width uppercase bar */
                    <div style={styles.sectionHeader}>
                        {formName?.toUpperCase() || 'MANUFACTURING PROCESS RECORDS'}
                    </div>
                )
            )}

            {/* METADATA GRID */}
            <table style={{ ...styles.table, marginBottom: isQA ? '4px' : '0' }}>
                <tbody>
                    {isQA ? (
                        <>
                            <tr>
                                <td colSpan="6" style={{
                                    ...styles.tdCenter,
                                    fontWeight: 'bold',
                                    fontSize: '11px',
                                    padding: '4px',
                                    textTransform: 'uppercase'
                                }}>
                                    {formName}
                                </td>
                            </tr>
                            <tr>
                                <td style={{ ...styles.td, fontWeight: 'bold', width: '12%', padding: '2px 4px' }}>Model No:</td>
                                <td style={{ ...styles.td, fontWeight: 'bold', width: '31%', padding: '2px 4px' }}>{modelNo || '-'}</td>
                                <td style={{ ...styles.td, fontWeight: 'bold', width: '13%', padding: '2px 4px' }}>Version No:</td>
                                <td style={{ ...styles.td, fontWeight: 'bold', width: '10%', padding: '2px 4px' }}>{versionNo}</td>
                                <td style={{ ...styles.td, fontWeight: 'bold', width: '9%', padding: '2px 4px' }}>Date:</td>
                                <td style={{ ...styles.td, fontWeight: 'bold', width: '25%', padding: '2px 4px' }}>{date}</td>
                            </tr>
                            <tr>
                                <td style={{ ...styles.td, fontWeight: 'bold', padding: '2px 4px' }}>Serial No:</td>
                                <td style={{ ...styles.td, fontWeight: 'bold', padding: '2px 4px' }}>{formatSerialNo(serialNo) || '-'}</td>
                                <td style={{ ...styles.td, fontWeight: 'bold', padding: '2px 4px' }}>Issue Date:</td>
                                <td style={{ ...styles.td, fontWeight: 'bold', padding: '2px 4px' }}>{issueDate}</td>
                                <td style={{ ...styles.td, fontWeight: 'bold', padding: '2px 4px' }}>{showTime ? 'Time:' : 'Issue No:'}</td>
                                <td style={{ ...styles.td, fontWeight: 'bold', padding: '2px 4px' }}>{showTime ? time : issueNo}</td>
                            </tr>
                        </>
                    ) : (
                        <>
                            <tr>
                                <td style={{ ...styles.td, fontWeight: 'bold', width: '80px' }}>Model No:</td>
                                <td style={{ ...styles.tdCenter, width: '220px', fontWeight: 'bold' }}>{modelNo || '-'}</td>
                                <td rowSpan="2" style={{ ...styles.td, width: '120px' }}>
                                    <strong>Document Reference No:</strong> <br />
                                    {docRef}
                                </td>
                                <td rowSpan="2" style={{ ...styles.tdCenter, width: '100px' }}>
                                    <strong>Version No.: {versionNo}</strong>
                                </td>
                                <td style={{ ...styles.td, width: '150px' }}>
                                    <strong>Date:</strong> {date}
                                </td>
                            </tr>
                            <tr>
                                <td style={{ ...styles.td, fontWeight: 'bold' }}>Serial No:</td>
                                <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>{formatSerialNo(serialNo) || '-'}</td>
                                <td style={styles.td}>
                                    <strong>Issue No:</strong> {issueNo}
                                </td>
                            </tr>
                        </>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default FormHeader;
