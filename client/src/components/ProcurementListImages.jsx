import procurement1 from '../assets/ProcurementList_1.png';
import procurement2 from '../assets/ProcurementList_2.png';
import procurement3 from '../assets/ProcurementList_3.png';

const ProcurementListImages = () => {
    const images = [procurement1, procurement2, procurement3];

    return (
        <div style={{ width: '100%', display: 'block' }}>
            {images.map((img, index) => (
                <div
                    key={index}
                    className="page-break"
                    style={{
                        padding: '20px 0',
                        textAlign: 'center',
                        width: '100%',
                        display: 'block'
                    }}
                >
                    <img
                        src={img}
                        alt={`Procurement List Page ${index + 1}`}
                        className="procurement-image"
                        style={{
                            width: '100%',
                            height: 'auto',
                            display: 'block',
                            objectFit: 'contain'
                        }}
                    />
                </div>
            ))}
        </div>
    );
};

export default ProcurementListImages;
