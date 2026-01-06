import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User';
import Role from './models/Role';
import bcrypt from 'bcryptjs';

dotenv.config();

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log('MongoDB Connected for Seeding');

        // Clear existing data
        await Role.deleteMany({});
        await User.deleteMany({});
        console.log('Cleared existing roles and users');

        // Seed Roles
        const roles = ['Admin', 'User', 'Viewer'];
        for (const roleName of roles) {
            const exists = await Role.findOne({ name: roleName });
            if (!exists) {
                await Role.create({
                    id: `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    name: roleName,
                    permissions: [] // Add default permissions if needed
                });
                console.log(`Role ${roleName} created`);
            }
        }

        // Clear existing users to ensure clean state
        await User.deleteMany({});
        console.log('Cleared existing users');

        // Seed Admin User
        const adminExists = await User.findOne({ contactNumber: 'admin' }); // Using 'admin' as contact number for simplicity/testing
        if (!adminExists) {
            const adminRole = await Role.findOne({ name: 'Admin' });
            console.log('Admin Role:', adminRole);

            if (!adminRole) {
                throw new Error('Admin role not found');
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('password123', salt);

            await User.create({
                id: `user_${Date.now()}`,
                name: 'System Admin',
                contactNumber: 'admin', // Using 'admin' as contact number
                password: hashedPassword,
                roleId: adminRole.id,
            });
            console.log('Admin user created (contactNumber: admin, password: password123)');
        } else {
            console.log('Admin user already exists');
        }

        process.exit();
    } catch (error: any) {
        console.error('Error seeding data:', error);
        if (error.errors) {
            console.error('Validation errors:', JSON.stringify(error.errors, null, 2));
        }
        process.exit(1);
    }
};

seedData();
