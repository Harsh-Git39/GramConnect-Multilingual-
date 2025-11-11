const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Supabase Configuration
const supabase = createClient(
    'https://mkszhsttgnzdflckgrwb.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rc3poc3R0Z256ZGZsY2tncndiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzQ5MDEsImV4cCI6MjA3MjY1MDkwMX0.xJqCaTUP5OYWNSwVT5FzKIFUfY902MzstJ5HIsHfE6A'
);

// Helper: Send JSON response
const sendResponse = (res, success, data = {}, error = null) => {
    res.json({ success, ...data, error });
};

// ===== AUTHENTICATION =====

// Signup
app.post('/api/signup', async (req, res) => {
    try {
        const { name, email, phone, location, userType, password } = req.body;
        
        if (!password) {
            return sendResponse(res, false, {}, 'Password is required');
        }
        
        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email, password
        });
        
        if (authError) return sendResponse(res, false, {}, authError.message);
        
        // Create profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .insert({ 
                id: authData.user.id, 
                name, 
                email, 
                phone, 
                location, 
                user_type: userType 
            })
            .select()
            .single();
        
        if (profileError) return sendResponse(res, false, {}, profileError.message);
        
        sendResponse(res, true, { 
            user: { 
                id: profile.id, 
                name: profile.name, 
                email: profile.email,
                type: profile.user_type, 
                location: profile.location, 
                phone: profile.phone 
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        sendResponse(res, false, {}, error.message);
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return sendResponse(res, false, {}, 'Email and password are required');
        }
        
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email, 
            password
        });
        
        if (authError) return sendResponse(res, false, {}, authError.message);
        
        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();
        
        if (profileError) return sendResponse(res, false, {}, profileError.message);
        
        sendResponse(res, true, { 
            user: { 
                id: profile.id, 
                name: profile.name, 
                email: profile.email,
                type: profile.user_type, 
                location: profile.location, 
                phone: profile.phone 
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        sendResponse(res, false, {}, error.message);
    }
});

// ===== JOB MANAGEMENT =====

// Get all jobs
app.get('/api/jobs', async (req, res) => {
    try {
        const { data: jobs, error: jobsError } = await supabase
            .from('jobs')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (jobsError) return sendResponse(res, false, {}, jobsError.message);
        
        // Debug: Log raw jobs from database
        console.log('Raw jobs from database:', JSON.stringify(jobs.slice(0, 2), null, 2));
        
        // Enrich with farmer details
        const enrichedJobs = await Promise.all(jobs.map(async (job) => {
            const { data: farmer } = await supabase
                .from('profiles')
                .select('name, phone')
                .eq('id', job.farmer_id)
                .single();
            
            // Log for debugging
            console.log('Processing job:', job.id, 'farmer_id:', job.farmer_id);
            
            return {
                id: job.id, 
                farmer_id: job.farmer_id, // Make sure this is included
                title: job.title, 
                description: job.description || '',
                duration: job.duration || '', 
                payRate: job.pay_rate || 0, 
                timeSlot: job.time_slot || '', 
                skillsRequired: job.skills_required || '',
                location: job.location || 'Location not specified',
                farmerName: farmer?.name || 'Unknown', 
                farmerPhone: farmer?.phone || 'N/A',
                postedDate: job.created_at, 
                status: job.status || 'active'
            };
        }));
        
        console.log('Enriched jobs sample:', JSON.stringify(enrichedJobs.slice(0, 2), null, 2));
        
        sendResponse(res, true, { jobs: enrichedJobs });
    } catch (error) {
        console.error('Get jobs error:', error);
        sendResponse(res, false, {}, error.message);
    }
});

// Post new job
app.post('/api/jobs', async (req, res) => {
    try {
        const { title, description, skillsRequired, timeSlot, duration, payRate } = req.body;
        const farmerId = req.headers['user-id'];
        
        if (!farmerId) return sendResponse(res, false, {}, 'Must be logged in');
        
        // Get farmer details
        const { data: farmer, error: farmerError } = await supabase
            .from('profiles')
            .select('name, phone, location')
            .eq('id', farmerId)
            .single();
        
        if (farmerError) return sendResponse(res, false, {}, 'Farmer not found');
        
        // Create job
        const { data: job, error: jobError } = await supabase
            .from('jobs')
            .insert({
                farmer_id: farmerId, 
                title, 
                description, 
                duration,
                pay_rate: parseInt(payRate), 
                location: farmer.location,
                status: 'active', 
                skills_required: skillsRequired, 
                time_slot: timeSlot
            })
            .select()
            .single();
        
        if (jobError) return sendResponse(res, false, {}, jobError.message);
        
        sendResponse(res, true, { 
            job: {
                id: job.id, 
                title: job.title, 
                description: job.description,
                duration: job.duration, 
                payRate: job.pay_rate, 
                timeSlot: job.time_slot, 
                skillsRequired: job.skills_required,
                location: job.location, 
                farmerName: farmer.name, 
                farmerPhone: farmer.phone, 
                postedDate: job.created_at, 
                status: job.status
            }
        });
    } catch (error) {
        console.error('Post job error:', error);
        sendResponse(res, false, {}, error.message);
    }
});

// ===== APPLICATION MANAGEMENT =====

// Get applications (for farmer)
app.get('/api/applications', async (req, res) => {
    try {
        const farmerId = req.headers['user-id'];
        
        if (!farmerId) return sendResponse(res, false, {}, 'Must be logged in');
        
        const { data: applications, error } = await supabase
            .from('job_applications')
            .select(`
                *, 
                jobs!inner(farmer_id, title),
                profiles!job_applications_worker_id_fkey(name, phone, location)
            `)
            .eq('jobs.farmer_id', farmerId)
            .order('created_at', { ascending: false });
        
        if (error) return sendResponse(res, false, {}, error.message);
        
        const formatted = applications.map(app => ({
            id: app.id, 
            jobId: app.job_id, 
            workerId: app.worker_id,
            workerName: app.profiles?.name || 'Unknown',
            workerPhone: app.profiles?.phone || 'N/A',
            workerLocation: app.profiles?.location || 'Unknown',
            jobTitle: app.jobs?.title || 'Unknown',
            appliedAt: app.created_at, 
            status: app.status || 'pending'
        }));
        
        sendResponse(res, true, { applications: formatted });
    } catch (error) {
        console.error('Get applications error:', error);
        sendResponse(res, false, {}, error.message);
    }
});

// Update application status
app.put('/api/applications/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const farmerId = req.headers['user-id'];
        
        if (!farmerId) return sendResponse(res, false, {}, 'Must be logged in');
        
        // Verify ownership
        const { data: check } = await supabase
            .from('job_applications')
            .select('jobs!inner(farmer_id)')
            .eq('id', id)
            .single();
        
        if (check?.jobs.farmer_id !== farmerId) {
            return sendResponse(res, false, {}, 'Unauthorized');
        }
        
        const { data: updated, error } = await supabase
            .from('job_applications')
            .update({ status })
            .eq('id', id)
            .select()
            .single();
        
        if (error) return sendResponse(res, false, {}, error.message);
        
        sendResponse(res, true, { application: updated });
    } catch (error) {
        console.error('Update application error:', error);
        sendResponse(res, false, {}, error.message);
    }
});

// Apply to job
app.post('/api/apply', async (req, res) => {
    try {
        const { jobId } = req.body;
        const workerId = req.headers['user-id'];
        
        if (!workerId) return sendResponse(res, false, {}, 'Must be logged in');
        
        // Check duplicate
        const { data: existing } = await supabase
            .from('job_applications')
            .select('id')
            .eq('job_id', jobId)
            .eq('worker_id', workerId)
            .single();
        
        if (existing) return sendResponse(res, false, {}, 'Already applied');
        
        const { data, error } = await supabase
            .from('job_applications')
            .insert({ 
                job_id: jobId, 
                worker_id: workerId, 
                status: 'pending' 
            })
            .select()
            .single();
        
        if (error) return sendResponse(res, false, {}, error.message);
        
        sendResponse(res, true, { message: 'Application submitted' });
    } catch (error) {
        console.error('Apply error:', error);
        sendResponse(res, false, {}, error.message);
    }
});

// Serve homepage
app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));

module.exports = app;