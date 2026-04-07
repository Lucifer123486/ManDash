const Prebooking = require('../models/Prebooking');
const User = require('../models/User');

// @desc    Create new prebooking
// @route   POST /api/prebooking
// @access  Private (Admin, Staff)
exports.createPrebooking = async (req, res) => {
    try {
        const prebooking = await Prebooking.create({
            ...req.body,
            createdBy: req.user._id
        });

        res.status(201).json({
            success: true,
            data: prebooking
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get all prebookings
// @route   GET /api/prebooking
// @access  Private (Admin, Staff)
exports.getAllPrebookings = async (req, res) => {
    try {
        const prebookings = await Prebooking.find()
            .populate('assignedSalesStaff', 'name email phone')
            .populate('createdBy', 'name')
            .sort('-createdAt');

        res.status(200).json({
            success: true,
            count: prebookings.length,
            data: prebookings
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get single prebooking
// @route   GET /api/prebooking/:id
// @access  Private (Admin, Staff)
exports.getPrebookingById = async (req, res) => {
    try {
        const prebooking = await Prebooking.findById(req.params.id)
            .populate('assignedSalesStaff', 'name email phone')
            .populate('callLogs.addedBy', 'name')
            .populate('createdBy', 'name');

        if (!prebooking) {
            return res.status(404).json({
                success: false,
                message: 'Prebooking not found'
            });
        }

        res.status(200).json({
            success: true,
            data: prebooking
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update prebooking
// @route   PATCH /api/prebooking/:id
// @access  Private (Admin, Staff)
exports.updatePrebooking = async (req, res) => {
    try {
        const prebooking = await Prebooking.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        }).populate('assignedSalesStaff', 'name email phone');

        if (!prebooking) {
            return res.status(404).json({
                success: false,
                message: 'Prebooking not found'
            });
        }

        res.status(200).json({
            success: true,
            data: prebooking
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Add call log
// @route   POST /api/prebooking/:id/call
// @access  Private (Admin, Staff)
exports.addCallLog = async (req, res) => {
    try {
        const prebooking = await Prebooking.findById(req.params.id);

        if (!prebooking) {
            return res.status(404).json({
                success: false,
                message: 'Prebooking not found'
            });
        }

        const body = req.body || {};
        const { description, status, specialNote } = body;
        
        if (!description) {
            return res.status(400).json({
                success: false,
                message: 'Description is required'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Call recording is mandatory'
            });
        }

        // Get relative path for the recording
        const recordingPath = `/uploads/call_recordings/${req.file.filename}`;

        // Add call log
        prebooking.callLogs.push({
            description,
            callRecording: recordingPath,
            specialNote: specialNote || '',
            addedBy: req.user._id,
            date: new Date()
        });

        // Update overall status if provided
        if (status) {
            prebooking.status = status;
        }

        await prebooking.save();

        res.status(200).json({
            success: true,
            data: prebooking
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};


// @desc    Export prebookings to Excel
// @route   GET /api/prebooking/export/excel
// @access  Private (Admin)
exports.exportPrebookingsExcel = async (req, res) => {
    try {
        const prebookings = await Prebooking.find()
            .populate('assignedSalesStaff', 'name email')
            .populate('callLogs.addedBy', 'name')
            .populate('createdBy', 'name')
            .sort('-createdAt');

        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Prebooking Communications');

        // Define columns
        worksheet.columns = [
            { header: 'Lead Name', key: 'name', width: 25 },
            { header: 'Phone', key: 'phone', width: 15 },
            { header: 'Email', key: 'email', width: 25 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Source', key: 'source', width: 15 },
            { header: 'Assigned Staff', key: 'assignedStaff', width: 20 },
            { header: 'Call Date', key: 'callDate', width: 20 },
            { header: 'Caller (Staff)', key: 'caller', width: 20 },
            { header: 'Communication Detail', key: 'description', width: 50 },
            { header: 'Special Note', key: 'specialNote', width: 30 },
            { header: 'Token Amount', key: 'tokenAmount', width: 15 },
            { header: 'Lead Created At', key: 'createdAt', width: 20 },
            { header: 'Recording Link', key: 'recording', width: 50 }
        ];

        // Get the host for the recording link
        const host = req.get('host');
        const protocol = req.protocol;
        const baseUrl = `${protocol}://${host}`;

        // Flatten data: Each call log is a row. If no call logs, just create one row for the lead.
        prebookings.forEach(p => {
            if (p.callLogs && p.callLogs.length > 0) {
                p.callLogs.forEach(log => {
                    const recordingUrl = log.callRecording ? `${baseUrl}${log.callRecording}` : '-';
                    worksheet.addRow({
                        name: p.name,
                        phone: p.phone,
                        email: p.email || '-',
                        status: p.status,
                        source: p.source,
                        assignedStaff: p.assignedSalesStaff?.name || '-',
                        callDate: new Date(log.date).toLocaleString('en-GB'),
                        caller: log.addedBy?.name || '-',
                        description: log.description,
                        specialNote: log.specialNote || '-',
                        tokenAmount: p.tokenAmount || 0,
                        createdAt: new Date(p.createdAt).toLocaleDateString('en-GB'),
                        recording: recordingUrl
                    });
                });
            } else {
                // Row for lead with no calls
                worksheet.addRow({
                    name: p.name,
                    phone: p.phone,
                    email: p.email || '-',
                    status: p.status,
                    source: p.source,
                    assignedStaff: p.assignedSalesStaff?.name || '-',
                    callDate: '-',
                    caller: '-',
                    description: '(No communication logged)',
                    specialNote: '-',
                    tokenAmount: p.tokenAmount || 0,
                    createdAt: new Date(p.createdAt).toLocaleDateString('en-GB'),
                    recording: '-'
                });
            }
        });

        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Set response headers
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=' + 'Prebooking_Report_' + Date.now() + '.xlsx'
        );

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error exporting Excel: ' + error.message
        });
    }
};

