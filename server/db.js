import dotenv from 'dotenv';
dotenv.config();

import ConnectDB from './db/connect.js';
import Organization from './models/OrganizationModal.js'; // Only using Organization model

const ORGANIZATION_ID = '682bf0cb3064d48936c341ce';

const start = async () => {
  try {
    await ConnectDB(process.env.MONGO_URI);

    // Example: Check if organization exists
    const org = await Organization.findById(ORGANIZATION_ID);
    if (!org) {
      console.log('Organization not found');
    } else {
      console.log('Organization found:', org.name);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message || error);
    process.exit(1);
  }
};

start();
