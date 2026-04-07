const ActivationRecord = require('../models/ActivationRecord');
const Drone = require('../models/Drone');
const FormSubmission = require('../models/FormSubmission');
const xlsx = require('xlsx');

exports.saveRecord = async (req, res) => {
    try {
        const { droneId } = req.params;
        const data = req.body;

        const drone = await Drone.findById(droneId);
        if (!drone) {
            return res.status(404).json({ success: false, message: 'Drone not found' });
        }

        // Update or Create ActivationRecord
        let record = await ActivationRecord.findOne({ droneId });
        if (record) {
            Object.assign(record, data);
            await record.save();
        } else {
            record = new ActivationRecord({ ...data, droneId });
            await record.save();
        }

        // --- Mark "ACTIVATION" Stage as completed in the Drone workflow ---
        const hasActivationStep = drone.completedSteps.some(step => step.step === 'ACTIVATION');

        if (!hasActivationStep) {
            const mongoose = require('mongoose');
            const FormSchema = require('../models/FormSchema');
            const activationSchema = await FormSchema.findOne({ formCode: 'ACTIVATION' });

            let submissionId = null;

            if (activationSchema) {
                // Only create a FormSubmission if we have a valid schema (required field)
                const newSubmission = new FormSubmission({
                    drone: droneId,
                    formSchema: activationSchema._id,  // required field — set before saving
                    status: 'approved',
                    submittedBy: req.user ? req.user.id : drone.assignedGS || null,
                    reviewedBy: req.user ? req.user.id : null,
                    formData: { customForm: true, recordId: record._id }
                });
                await newSubmission.save();
                submissionId = newSubmission._id;
            }

            drone.completedSteps.push({
                step: 'ACTIVATION',
                completedAt: new Date(),
                completedBy: req.user ? req.user.id : null,
                formSubmission: submissionId
            });
            await drone.save();
        }


        res.status(200).json({ success: true, data: record, message: 'Activation record saved successfully' });
    } catch (err) {
        console.error("Error saving activation record:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getRecord = async (req, res) => {
    try {
        const { droneId } = req.params;
        const record = await ActivationRecord.findOne({ droneId });
        // Even if not found, we just return empty, it's fine for autofill logic
        res.status(200).json({ success: true, data: record });
    } catch (err) {
        console.error("Error fetching activation record:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getAllRecords = async (req, res) => {
    try {
        const records = await ActivationRecord.find().sort({ createdAt: -1 });
        console.log(`[Activation] Fetched ${records.length} records for frontend.`);
        res.status(200).json({ success: true, data: records });
    } catch (err) {
        console.error("Error fetching all activation records:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.exportExcel = async (req, res) => {
    try {
        const records = await ActivationRecord.find().sort({ createdAt: -1 });

        // Format data for Excel
        const excelData = records.map(record => ({
            'Serial Number': record.serialNumber || '-',
            'Client Name': record.clientName || '-',
            'Flight Controller Number': record.flightControllerNumber || '-',
            'GCS Number': record.gcsNumber || '-',
            'Obstacle avoidance': record.obstacleAvoidance || '-',
            'Ground radar': record.groundRadar || '-',
            'GPS': record.gps || '-',
            'Manufacturing Date': record.manufacturingDate ? new Date(record.manufacturingDate).toLocaleDateString('en-GB') : '-',
            'UIN': record.uin || '-',
            'ISSUE DATE': record.issueDate ? new Date(record.issueDate).toLocaleDateString('en-GB') : '-',
            'STATUS': record.status || '-',
            'UIN TRANSFER': record.uinTransfer || '-'
        }));

        if (excelData.length === 0) {
            // Push empty row so sheet has headers
            excelData.push({
                'Serial Number': '', 'Client Name': '', 'Flight Controller Number': '', 'GCS Number': '',
                'Obstacle avoidance': '', 'Ground radar': '', 'GPS': '', 'Manufacturing Date': '',
                'UIN': '', 'ISSUE DATE': '', 'STATUS': '', 'UIN TRANSFER': ''
            });
        }

        const ws = xlsx.utils.json_to_sheet(excelData);

        // Auto-size columns loosely
        const colWidths = [
            { wch: 20 }, // Serial
            { wch: 30 }, // Client
            { wch: 30 }, // FC
            { wch: 25 }, // GCS 
            { wch: 25 }, // Obs
            { wch: 25 }, // Radar
            { wch: 25 }, // GPS
            { wch: 15 }, // Mfg Date
            { wch: 15 }, // UIN
            { wch: 15 }, // Issue Date
            { wch: 15 }, // Status
            { wch: 20 }  // UIN transfer
        ];
        ws['!cols'] = colWidths;

        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Activation Records");

        // Generate buffer
        const excelBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Activation_Records.xlsx');

        res.status(200).send(excelBuffer);
    } catch (err) {
        console.error("Error exporting excel:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};
