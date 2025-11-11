const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mkszhsttgnzdflckgrwb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rc3poc3R0Z256ZGZsY2tncndiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzQ5MDEsImV4cCI6MjA3MjY1MDkwMX0.xJqCaTUP5OYWNSwVT5FzKIFUfY902MzstJ5HIsHfE6A';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .limit(1);
        
        if (error) {
            console.log('❌ Database connection failed:', error.message);
        } else {
            console.log('✅ Database connected successfully!');
            console.log('Tables are ready to use.');
        }
    } catch (err) {
        console.log('❌ Error:', err.message);
    }
}

testConnection();