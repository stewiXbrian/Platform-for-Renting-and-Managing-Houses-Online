
import Fastify from 'fastify';
import { MongoClient, Binary } from 'mongodb';
import { randomUUID as cryptoRandomUUID } from 'crypto';
import fastifyCors from '@fastify/cors';
import fastifyMultipart from '@fastify/multipart';
import { GridFSBucket } from 'mongodb';
import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';

const fastify = Fastify({ logger: true });

const uri = 'replace with mongo uri';
const client = new MongoClient(uri);

async function connectToDatabase() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
}

fastify.register(fastifyCors, {
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-Action-Type'
  ],
  credentials: true,
});

fastify.register(fastifyMultipart, {
  limits: { fileSize: 5 * 1024 * 1024, files: 6 }
});

const mailerSend = new MailerSend({
  apiKey: 'replace with mailsender api key',
});
const SENDER_EMAIL = 'noreply@test-xkjn41m5njq4z781.mlsender.net';//use another email from website

const verificationTokens = new Map();


fastify.post('/sendVerification', async (request, reply) => {
  const { email, password, firstName, lastName } = request.body;
  if (!email || !password || !firstName || !lastName) {
    return reply.status(400).send({ error: 'Email, password, firstName, and lastName are required' });
  }
  const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  verificationTokens.set(email, { token: verificationCode, password, firstName, lastName });

  try {
    const sentFrom = new Sender(SENDER_EMAIL, 'Sign up Verification');
    const recipients = [new Recipient(email)];
    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject('Your Verification Code')
      .setHtml(`<p>Your verification code is: <strong>${verificationCode}</strong></p>`)
      .setText(`Your verification code is: ${verificationCode}`);
    await mailerSend.email.send(emailParams);
    reply.status(200).send({ message: 'Verification email sent' });
  } catch (error) {
    console.error('Error sending email:', error);
    reply.status(500).send({ error: 'Failed to send verification email', details: error.message });
  }
});

fastify.post('/verify', async (request, reply) => {
  const { email, token } = request.body;
  if (!email || !token) {
    return reply.status(400).send({ error: 'Email and verification code are required' });
  }
  const storedData = verificationTokens.get(email);
  if (storedData && storedData.token === token) {
    const { password, firstName, lastName } = storedData;
    verificationTokens.delete(email);
    try {
      const db = client.db('PFE');
      const usersCollection = db.collection('users');
      const profilesCollection = db.collection('profiles');
      const existingUser = await usersCollection.findOne({ email });
      if (existingUser) {
        return reply.status(400).send({ error: 'Email already registered' });
      }
      const userId = cryptoRandomUUID();
      const now = new Date();
      await usersCollection.insertOne({
        userId, email, password, first_name: firstName, last_name: lastName, created_at: now
      });
      await profilesCollection.insertOne({
        userId, host: `${firstName} ${lastName}`, bio: '', avatar: null, location: '', languages: [],
        interests: [], notifications: [], is_phone_verified: false, phone_number: '', created_at: now,
      });
      return reply.status(201).send({ success: true, userId });
    } catch (error) {
      fastify.log.error('Registration error:', error);
      return reply.status(500).send({ error: error.message || 'Registration failed' });
    }
  } else {
    return reply.status(400).send({ error: 'Invalid or incorrect verification code' });
  }
});

fastify.post('/login', async (request, reply) => {
  const { email, password } = request.body;
  if (!email || !password) {
    return reply.status(400).send({ error: 'Email and password are required' });
  }
  try {
    const db = client.db('PFE');
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ email });
    if (!user || user.password !== password) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }
    return reply.send({ success: true, userId: user.userId });
  } catch (error) {
    fastify.log.error('Login error:', error);
    return reply.status(500).send({ error: error.message || 'Login failed' });
  }
});

fastify.get('/profile', async (request, reply) => {
  const { userId } = request.query;
  if (!userId) {
    return reply.status(400).send({ error: 'userId is required' });
  }
  try {
    const db = client.db('PFE');
    const profilesCollection = db.collection('profiles');
    const profile = await profilesCollection.findOne({ userId });
    if (!profile) {
      return reply.status(404).send({ error: 'Profile not found' });
    }
    const avatarBase64 = profile.avatar ? `data:image/jpeg;base64,${profile.avatar.buffer.toString('base64')}` : null;
    return reply.send({
      email: profile.email || '', host: profile.host || '', bio: profile.bio || '', avatar: avatarBase64,
      created_at: profile.created_at, location: profile.location || '', languages: profile.languages || [],
      interests: profile.interests || [], phone_number: profile.phone_number || '', is_phone_verified: false
    });
  } catch (error) {
    fastify.log.error('Profile fetch error:', error);
    return reply.status(500).send({ error: error.message || 'Failed to fetch profile' });
  }
});

fastify.put('/profile', async (request, reply) => {
  const { userId } = request.query;
  if (!userId) {
    return reply.status(400).send({ error: 'userId is required' });
  }
  try {
    const db = client.db('PFE');
    const profilesCollection = db.collection('profiles');
    let formData = {};
    let avatarBuffer = null;
    const parts = request.parts();
    for await (const part of parts) {
      if (part.type === 'field' && part.fieldname === 'data') {
        formData = JSON.parse(part.value);
      } else if (part.type === 'file' && part.fieldname === 'avatar') {
        avatarBuffer = await part.toBuffer();
      }
    }
    if (formData.userId !== userId) {
      return reply.status(400).send({ error: 'userId mismatch between query and form data' });
    }
    const update = {};
    if ('bio' in formData) update.bio = formData.bio || '';
    if ('location' in formData) update.location = formData.location || '';
    if ('languages' in formData) update.languages = formData.languages || [];
    if ('interests' in formData) update.interests = formData.interests || [];
    if ('phone_number' in formData) update.phone_number = formData.phone_number || '';
    if ('is_phone_verified' in formData) update.is_phone_verified = formData.is_phone_verified || false;
    if (avatarBuffer) update.avatar = new Binary(avatarBuffer);
    if (Object.keys(update).length === 0) {
      return reply.status(400).send({ error: 'No valid fields to update' });
    }
    const result = await profilesCollection.updateOne({ userId }, { $set: update });
    if (result.matchedCount === 0) {
      return reply.status(404).send({ error: 'Profile not found' });
    }
    return reply.send({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    fastify.log.error('Profile update error:', error);
    return reply.status(500).send({ error: error.message || 'Failed to update profile' });
  }
});


fastify.post('/profile/notification', async (request, reply) => {
  const body = request.body;
  try {
    const db = client.db('PFE');
    const profilesCollection = db.collection('profiles');

      const recipient = await profilesCollection.findOne({ userId: body.reciever_id });
      const sender = await profilesCollection.findOne({ userId: body.sender_id });
    

      const now = new Date();
      const recipientNotification = {
        _id: cryptoRandomUUID(),
        type: body.type,
        sender_id: body.sender_id,
        content: body.content,
        listingId: body.listingId,
        status: 'unread',
        created_at: now
      };

    
      await profilesCollection.updateOne(
        { userId: body.reciever_id },
        { $push: { notifications: recipientNotification } }
      );

  
  
    if (body.type === 'reply') {
      // Handle reply notifications
      const recipient = await profilesCollection.findOne({ userId: body.recipient_id });
      const sender = await profilesCollection.findOne({ userId: body.sender_id });
      if (!recipient || !sender) {
        return reply.status(404).send({ error: 'User not found' });
      }

      const now = new Date();
      const senderReplyNotification = {
        _id: cryptoRandomUUID(),
        type: 'reply',
        sender_id: body.sender_id,
        recipient_id: body.recipient_id,
        content: body.content,
        original_message_id: body.original_message_id,
        listingId: body.listingId,
        is_sent: true,
        status: 'read',
        created_at: now
      };




      // Create a reply notification for the recipient, linked to the original message
      const recipientReplyNotification = {
        _id: cryptoRandomUUID(),
        type: 'message',
        sender_id: body.sender_id,
        recipient_id: body.recipient_id,
        content: body.content,
        original_message_id: body.original_message_id,
        listingId: body.listingId,
        status: 'unread',
        created_at: now
      };
//////////////////////////////////////////////////////////////////////////////
      // Push the reply notification to the recipient
      await profilesCollection.updateOne(
        { userId: body.recipient_id },
        { $push: { notifications: recipientReplyNotification } }
      );

      // Push the reply notification to the sender
      await profilesCollection.updateOne(
        { userId: body.sender_id },
        { $push: { notifications: senderReplyNotification } }
      );
    } 

    return reply.send({ success: true });
  }  catch (error) {
    fastify.log.error('Notification add error:', error);
    return reply.status(500).send({ error: error.message || 'Failed to add notification' });
  }
});



fastify.put('/profile/notification/read', async (request, reply) => {
  const { notificationIds, notificationId, userId } = request.body;
  try {
    const db = client.db('PFE');
    const profilesCollection = db.collection('profiles');
    let updateQuery = {};
    let arrayFilter = {};
    if (notificationId) {
      updateQuery = { userId, 'notifications._id': notificationId };
      arrayFilter = { 'elem._id': notificationId };
    } else if (notificationIds && Array.isArray(notificationIds)) {
      updateQuery = { userId, 'notifications._id': { $in: notificationIds } };
      arrayFilter = { 'elem._id': { $in: notificationIds } };
    } else {
      return reply.status(400).send({ error: 'Invalid request: Provide notificationId or notificationIds' });
    }
    const result = await profilesCollection.updateOne(
      updateQuery,
      { $set: { 'notifications.$[elem].status': 'read', 'notifications.$[elem].updated_at': new Date() } },
      { arrayFilters: [arrayFilter], multi: true }
    );
    if (result.matchedCount === 0) {
      return reply.status(404).send({ error: 'User or notifications not found' });
    }
    return reply.send({ success: true, updatedCount: result.modifiedCount });
  } catch (error) {
    fastify.log.error('Notification read error:', error);
    return reply.status(500).send({ error: error.message || 'Failed to mark notifications as read' });
  }
});

fastify.delete('/profile/notification', async (request, reply) => {
  const { notificationIds, userId } = request.body;
  try {
    const db = client.db('PFE');
    const profilesCollection = db.collection('profiles');
    if (!notificationIds || !userId) {
      return reply.status(400).send({ error: 'notificationIds and userId are required' });
    }
    const idsToDelete = Array.isArray(notificationIds) ? notificationIds : [notificationIds];
    if (idsToDelete.length === 0) {
      return reply.status(400).send({ error: 'notificationIds cannot be empty' });
    }
    const result = await profilesCollection.updateOne(
      { userId },
      { $pull: { notifications: { _id: { $in: idsToDelete } } } }
    );
    if (result.matchedCount === 0) {
      return reply.status(404).send({ error: 'User not found' });
    }
    return reply.send({ success: true, deletedCount: result.modifiedCount });
  } catch (error) {
    fastify.log.error('Notification delete error:', error);
    return reply.status(500).send({ error: error.message || 'Failed to delete notifications' });
  }
});



fastify.put('/bookings', async (request, reply) => {
  const { notificationId, userId, action } = request.body;
  try {
    if (!notificationId || !userId || !action) {
      return reply.status(400).send({ error: 'notificationId, userId, and action are required' });
    }
    const validActions = ['accept', 'decline', 'confirm', 'cancel'];
    if (!validActions.includes(action)) {
      return reply.status(400).send({ error: 'Invalid action', validActions: validActions.join(', ') });
    }
    const db = client.db('PFE');
    const profilesCollection = db.collection('profiles');
    const listingsCollection = db.collection('listings');

    const profile = await profilesCollection.findOne({ userId, 'notifications._id': notificationId });
    if (!profile) {
      return reply.status(404).send({ error: 'User or notification not found' });
    }
    const notification = profile.notifications.find(n => n._id === notificationId);
    const validateAction = (type, action, allowed) =>
      allowed.includes(action) ? null : { error: `Action ${action} not allowed for ${type}`, allowedActions: allowed };
    if (notification.type === 'booking-request') {
      const error = validateAction('booking requests', action, ['accept', 'decline']);
      if (error) return reply.status(400).send(error);
    } else if (notification.type === 'booking-approval') {
      const error = validateAction('booking approvals', action, ['confirm', 'cancel']);
      if (error) return reply.status(400).send(error);
    } else {
      return reply.status(400).send({ error: 'Invalid notification type' });
    }
    const updateNotification = async (userId, notificationId, status, bookingStatus) => {
      const result = await profilesCollection.updateOne(
        { userId, 'notifications._id': notificationId },
        { $set: { 'notifications.$[elem].status': status, 'notifications.$[elem].booking_status': bookingStatus, 'notifications.$[elem].updated_at': new Date() } },
        { arrayFilters: [{ 'elem._id': notificationId }] }
      );
      if (result.matchedCount === 0 || result.modifiedCount === 0) throw new Error('Notification update failed');
    };
    const deleteNotification = async (userId, notificationId) => {
      const result = await profilesCollection.updateOne(
        { userId },
        { $pull: { notifications: { _id: notificationId } } }
      );
      if (result.matchedCount === 0) throw new Error('User not found');
      return result.modifiedCount;
    };
    if (action === 'accept' && notification.type === 'booking-request') {

      const senderProfile = await profilesCollection.findOne({ userId: notification.sender_id });
      if (!senderProfile) return reply.status(404).send({ error: 'Sender not found' });
      const bookingApprovalNotification = {
        _id: cryptoRandomUUID(), type: 'booking-approval', sender_id: userId, content: notification.content,
        listingId: notification.listingId, status: 'unread', created_at: new Date()
      };
      await profilesCollection.updateOne(
        { userId: notification.sender_id },
        { $push: { notifications: bookingApprovalNotification } }
      );
      await updateNotification(userId, notificationId, 'read', 'accepted');
      return reply.send({ success: true, message: 'Booking accepted, approval sent to sender' });
    }
    if (action === 'decline' || action === 'cancel') {

      const deletedCount = await deleteNotification(userId, notificationId);
      
     await profilesCollection.updateOne({ userId: notification.sender_id },{$set:{sentReservation:false}});
      await listingsCollection.updateOne({ listingId: notification.listingId }, { $set: { candidates: notification.candidates-1 } });




      return reply.send({ success: true, message: `Booking ${action}ed and notification deleted`, deletedCount });
    }

    if (action === 'confirm' && notification.type === 'booking-approval') {
      const listingId = notification.listingId;
      if (!listingId) return reply.status(400).send({ error: 'listingId is required for confirmation' });
      await updateNotification(userId, notificationId, 'read', 'confirmed');
      ////////////////////////////////////////////////////////////////////////////////////////////////////
    
      await profilesCollection.updateOne({userId:notification.sender_id }, { $addToSet: { rentedListings:{listingId:listingId,renterId:userId} } });
      await profilesCollection.updateOne({userId}, { $addToSet: { rentals: listingId } });


    const listingsCollection = db.collection('listings');
    const listing = await listingsCollection.findOne({ listingId });
    if (!listing) return reply.status(404).send({ error: 'Listing not found' });

    const updateData = {
      unavailable:true
    };

   await listingsCollection.updateOne({ listingId }, { $set: updateData });



      //////////////////////////////////////////////////////////////////////////////////////////////////

      return reply.send({ success: true, message: 'Booking confirmed and added to rented listings' });
    }
    return reply.status(400).send({ error: 'Invalid action for this notification type' });
  } catch (error) {
    fastify.log.error(`Booking ${action} error:`, error);
    return reply.status(500).send({ error: error.message || `Failed to ${action} booking` });
  }
});


fastify.get('/profile/notification', async (request, reply) => {
  const { userId } = request.query;
  if (!userId) {
    return reply.status(400).send({ error: 'userId is required' });
  }
  try {
    const db = client.db('PFE');
    const profilesCollection = db.collection('profiles');
    const listingsCollection = db.collection('listings');
    const bucket = new GridFSBucket(db, { bucketName: 'photos' });
    const profile = await profilesCollection.findOne({ userId });
    if (!profile) {
      return reply.status(404).send({ error: 'Profile not found' });
    }
    const notifications = profile.notifications || [];
    const enrichedNotifications = await Promise.all(notifications.map(async (notification) => {
      let listingData = {};
      if (notification.listingId) {
        const listing = await listingsCollection.findOne({ listingId: notification.listingId });
        if (listing) {
          let firstPhoto = null;
          if (listing.photos && listing.photos.length > 0) {
            const photoId = listing.photos[0];
            const downloadStream = bucket.openDownloadStreamByName(photoId);
            const chunks = [];
            await new Promise((resolve, reject) => {
              downloadStream.on('data', chunk => chunks.push(chunk));
              downloadStream.on('end', () => {
                const buffer = Buffer.concat(chunks);
                firstPhoto = `data:image/jpeg;base64,${buffer.toString('base64')}`;
                resolve();
              });
              downloadStream.on('error', reject);
            });
          }
          listingData = { price: listing.price || 0, firstPhoto: firstPhoto || null };
        }
      }
      let senderName = null;
      let senderImage = null;
      if (notification.sender_id) {
        const senderProfile = await profilesCollection.findOne({ userId: notification.sender_id });
        if (senderProfile) {
          senderName = senderProfile.host;
          senderImage = senderProfile.avatar ? `data:image/jpeg;base64,${senderProfile.avatar.buffer.toString('base64')}` : null;
        }
      }
      if ((notification.type === 'message' || notification.type === 'reply') && notification.is_sent) {
        const recipient = await profilesCollection.findOne({ userId: notification.recipient_id });
        if (recipient) {
          return {
            content: notification.content,
            sender_id: notification.sender_id,
            recipient_id: notification.recipient_id,
            recipient_name: recipient.host,
            recipient_image: recipient.avatar ? `data:image/jpeg;base64,${recipient.avatar.buffer.toString('base64')}` : null,
            sender_name: senderName,
            sender_image: senderImage,
            price: listingData.price || null,
            firstPhoto: listingData.firstPhoto || null,
            listingId: notification.listingId || null,
            _id: notification._id,
            type: notification.type,
            status: notification.status,
            created_at: notification.created_at,
            original_message_id: notification.original_message_id || null,
            is_sent: true,
            booking_status: notification.booking_status || null,
            updated_at: notification.updated_at || null
          };
        }
      }
      return {
        content: notification.content,
        sender_id: notification.sender_id,
        sender_name: senderName,
        sender_image: senderImage,
        price: listingData.price || null,
        firstPhoto: listingData.firstPhoto || null,
        listingId: notification.listingId || null,
        _id: notification._id,
        type: notification.type,
        status: notification.status,
        created_at: notification.created_at,
        original_message_id: notification.original_message_id || null,
        is_sent: notification.is_sent || false,
        booking_status: notification.booking_status || null,
        updated_at: notification.updated_at || null
      };
    }));
    return reply.send(enrichedNotifications);
  } catch (error) {
    fastify.log.error('Notification fetch error:', error);
    return reply.status(500).send({ error: error.message || 'Failed to fetch notifications' });
  }
});

fastify.post('/listings', async (request, reply) => {
  try {
    const parts = request.parts();
    let formData = {};
    const photoBuffers = [];
    for await (const part of parts) {
      if (part.type === 'field' && part.fieldname === 'data') formData = JSON.parse(part.value);
      else if (part.type === 'file' && part.fieldname === 'photos') {
        photoBuffers.push({ buffer: await part.toBuffer(), filename: part.filename });
      }
    }
    const userId = formData.userId;
    if (!userId) return reply.status(400).send({ error: 'userId is required' });
    const db = client.db('PFE');
    const listingsCollection = db.collection('listings');
    const usersCollection = db.collection('users');
    const bucket = new GridFSBucket(db, { bucketName: 'photos' });
    const user = await usersCollection.findOne({ userId });
    if (!user) return reply.status(404).send({ error: 'User not found' });
    const host = `${user.first_name} ${user.last_name}` || 'Unknown Host';
    const listingId = cryptoRandomUUID();
    const photoIds = [];
    for (const photo of photoBuffers) {
      const photoId = cryptoRandomUUID();
      const uploadStream = bucket.openUploadStream(photoId, { metadata: { listingId, userId } });
      await new Promise((resolve, reject) => {
        uploadStream.write(photo.buffer);
        uploadStream.end(err => err ? reject(err) : resolve());
      });
      photoIds.push(photoId);
    }
    await listingsCollection.insertOne({ userId, listingId, host, ...formData, photos: photoIds, publishedAt: null });
    return reply.status(201).send({ success: true, listingId, message: 'Listing created successfully' });
  } catch (error) {
    fastify.log.error('Listing creation error:', error);
    return reply.status(500).send({ error: error.message || 'Failed to create listing' });
  }
});


fastify.put('/listings', async (request, reply) => {
  try {
    const actionType = request.headers['x-action-type'];
    const { listingId, unpublished, isFavorite , candidates} = request.body;

    if (!listingId) return reply.status(400).send({ error: 'listingId is required' });

    const db = client.db('PFE');
    const listingsCollection = db.collection('listings');
    const listing = await listingsCollection.findOne({ listingId });

    if (!listing) return reply.status(404).send({ error: 'Listing not found' });

    let updateData = null;

    if (actionType === 'handle-favorite-toggle') {
      updateData = { isFavorite };
    }

    if (actionType === 'handle-publishing') {
      updateData = {
        unpublished,
        publishedAt: unpublished ? null : new Date()
      };
    }

    if (actionType === 'handle-reservation-click') {
      updateData = {
        candidates
      };

    }

    if (!updateData) {
      return reply.status(400).send({ error: 'Invalid action type or missing data' });
    }

    const result = await listingsCollection.updateOne({ listingId }, { $set: updateData });

    if (result.matchedCount === 0) return reply.status(404).send({ error: 'Listing not found' });
    if (result.modifiedCount === 0) return reply.status(400).send({ error: 'Listing not updated' });

    return reply.send({ success: true, message: 'Listing updated' });

  } catch (error) {
    fastify.log.error('Listing update error:', error);
    return reply.status(500).send({ error: error.message || 'Failed to update listing' });
  }
});


fastify.get('/listings', async (request, reply) => {
  try {
    const db = client.db('PFE');
    const listingsCollection = db.collection('listings');
    const bucket = new GridFSBucket(db, { bucketName: 'photos' });
    let query = {
      unpublished: false, // Ensure unpublished is false
      unavailable:false,
      ...(request.query.city ? { 'location.locationText': { $regex: new RegExp(request.query.city, 'i') } } : {})
    };
    console.log(request.query.city);
    const listings = await listingsCollection.find(query).toArray();
    for (const listing of listings) {
      if (listing.photos && listing.photos.length > 0) {
        const photoBuffers = [];
        for (const photoId of listing.photos) {
          const downloadStream = bucket.openDownloadStreamByName(photoId);
          const chunks = [];
          await new Promise((resolve, reject) => {
            downloadStream.on('data', chunk => chunks.push(chunk));
            downloadStream.on('end', () => {
              photoBuffers.push(`data:image/jpeg;base64,${Buffer.concat(chunks).toString('base64')}`);
              resolve();
            });
            downloadStream.on('error', reject);
          });
        }
        listing.photos = photoBuffers;
      }
    }
    return reply.send(listings);
  } catch (error) {
    fastify.log.error('Listings fetch error:', error);
    return reply.status(500).send({ error: error.message || 'Failed to fetch listings' });
  }
});

fastify.delete('/listings', async (request, reply) => {
  const { listingId } = request.query;
  if (!listingId) return reply.status(400).send({ error: 'listingId query parameter is required' });
  try {
    const db = client.db('PFE');
    const listingsCollection = db.collection('listings');
    const profilesCollection = db.collection('profiles');
    const bucket = new GridFSBucket(db, { bucketName: 'photos' });
    const listing = await listingsCollection.findOneAndDelete({ listingId:listingId });
    if (!listing.value) return reply.status(404).send({ error: 'Listing not found' });
    if (listing.value.photos && listing.value.photos.length > 0) {
      const filesCollection = db.collection('photos.files');
      const chunksCollection = db.collection('photos.chunks');
      await Promise.all(listing.value.photos.map(async (photoId) => {
        const file = await filesCollection.findOne({ filename: photoId });
        if (file) {
          await filesCollection.deleteOne({ _id: file._id });
          await chunksCollection.deleteMany({ files_id: file._id });
        }
      }));
    }
    await profilesCollection.updateMany({}, { $pull: { bookmarks: listingId, rented: listingId } });
    return reply.send({ success: true, message: 'Listing and associated data cleaned up successfully' });
  } catch (error) {
    console.error('Listing deletion error:', error);
    return reply.status(500).send({ error: 'Failed to delete listing', details: error.message });
  }
});

fastify.get('/myListings', async (request, reply) => {
  const { userId } = request.query;
  if (!userId) return reply.status(400).send({ error: 'userId is required' });
  try {
    const db = client.db('PFE');
    const listingsCollection = db.collection('listings');
    const profilesCollection = db.collection('profiles');
    const bucket = new GridFSBucket(db, { bucketName: 'photos' });

    const profile = await profilesCollection.findOne({ userId });
    if (!profile) return reply.status(404).send({ error: 'User profile not found' });

    const rentedListings = profile.rentedListings || [];
    const rentedListingIds = rentedListings.map(item => item.listingId);

    const unpublishedListings = await listingsCollection.find({ userId, unpublished: true }).toArray();
    const activeListings = await listingsCollection.find({ 
      userId, 
      unpublished: false,
      listingId: { $nin: rentedListingIds }
    }).toArray();
    const rentedListingsDetails = rentedListingIds.length > 0 
      ? await listingsCollection.find({ listingId: { $in: rentedListingIds } }).toArray() 
      : [];

    const processPhotos = async (listing) => {
      if (listing.photos && listing.photos.length > 0) {
        const photoBuffers = [];
        for (const photoId of listing.photos) {
          const downloadStream = bucket.openDownloadStreamByName(photoId);
          const chunks = [];
          await new Promise((resolve, reject) => {
            downloadStream.on('data', chunk => chunks.push(chunk));
            downloadStream.on('end', () => {
              photoBuffers.push(`data:image/jpeg;base64,${Buffer.concat(chunks).toString('base64')}`);
              resolve();
            });
            downloadStream.on('error', reject);
          });
        }
        listing.photos = photoBuffers;
      }
      return listing;
    };

    const processedUnpublishedListings = await Promise.all(unpublishedListings.map(async (listing) => ({ ...await processPhotos(listing), listingType: 'owned' })));
    const processedActiveListings = await Promise.all(activeListings.map(async (listing) => ({ ...await processPhotos(listing), listingType: 'owned' })));
    const processedRentedListings = await Promise.all(rentedListingsDetails.map(async (listing, index) => ({
      ...await processPhotos(listing),
      listingType: 'rented',
      renterId: rentedListings[index].renterId 
    })));

    return reply.send({
      unpublished: processedUnpublishedListings,
      active: processedActiveListings,
      rented: processedRentedListings
    });
  } catch (error) {
    fastify.log.error('My listings fetch error:', error);
    return reply.status(500).send({ error: error.message || 'Failed to fetch my listings' });
  }
});



fastify.get('/rentals', async (request, reply) => {
  const { userId } = request.query;
  if (!userId) return reply.status(400).send({ error: 'userId is required' });

  try {
    const db = client.db('PFE');
    const profilesCollection = db.collection('profiles');
    const listingsCollection = db.collection('listings');
    const bucket = new GridFSBucket(db, { bucketName: 'photos' });

    const profile = await profilesCollection.findOne({ userId });
    if (!profile) return reply.status(404).send({ error: 'User profile not found' });

    const rentalListingIds = profile.rentals || [];
    const rentalListings = rentalListingIds.length > 0
      ? await listingsCollection.find({ listingId: { $in: rentalListingIds } }).toArray()
      : [];

    const processPhotos = async (listing) => {
      if (listing.photos && listing.photos.length > 0) {
        const photoBuffers = [];
        for (const photoId of listing.photos) {
          const downloadStream = bucket.openDownloadStreamByName(photoId);
          const chunks = [];
          await new Promise((resolve, reject) => {
            downloadStream.on('data', chunk => chunks.push(chunk));
            downloadStream.on('end', () => {
              photoBuffers.push(`data:image/jpeg;base64,${Buffer.concat(chunks).toString('base64')}`);
              resolve();
            });
            downloadStream.on('error', reject);
          });
        }
        listing.photos = photoBuffers;
      }
      return listing;
    };

    const processedRentalListings = await Promise.all(rentalListings.map(processPhotos));
    return reply.send(processedRentalListings);
  } catch (error) {
    fastify.log.error('Rental listings fetch error:', error);
    return reply.status(500).send({ error: error.message || 'Failed to fetch rental listings' });
  }
});

fastify.get('/listing', async (request, reply) => {
  const { listingId } = request.query;
  if (!listingId) return reply.status(400).send({ error: 'listingId is required' });
  try {
    const db = client.db('PFE');
    const listingsCollection = db.collection('listings');
    const profilesCollection = db.collection('profiles');
    const bucket = new GridFSBucket(db, { bucketName: 'photos' });
    let listing = await listingsCollection.findOne({ listingId });
    if (!listing) return reply.status(404).send({ error: 'Listing not found' });
    if (listing.photos && listing.photos.length > 0) {
      const photoBuffers = [];
      for (const photoId of listing.photos) {
        const downloadStream = bucket.openDownloadStreamByName(photoId);
        const chunks = [];
        await new Promise((resolve, reject) => {
          downloadStream.on('data', chunk => chunks.push(chunk));
          downloadStream.on('end', () => {
            photoBuffers.push(`data:image/jpeg;base64,${Buffer.concat(chunks).toString('base64')}`);
            resolve();
          });
          downloadStream.on('error', reject);
        });
      }
      listing.photos = photoBuffers;
    }
    const profile = await profilesCollection.findOne({ userId: listing.userId });
    if (!profile) return reply.status(404).send({ error: 'Profile not found' });
    const avatarBase64 = profile.avatar ? `data:image/jpeg;base64,${profile.avatar.buffer.toString('base64')}` : null;
    listing = { ...listing, avatar: avatarBase64 };
    return reply.send(listing);
  } catch (error) {
    fastify.log.error('Listing fetch error:', error);
    return reply.status(500).send({ error: error.message || 'Failed to fetch listing' });
  }
});

fastify.route({
  method: ['POST', 'DELETE'],
  url: '/bookmarks',
  handler: async (request, reply) => {
    const { userId } = request.query;
    const { listingId } = request.body;

    if (!userId || !listingId) {
      return reply.status(400).send({ error: 'userId and listingId are required' });
    }

    try {
      const db = client.db('PFE');
      const profilesCollection = db.collection('profiles');
      const profile = await profilesCollection.findOne({ userId });
      if (!profile) return reply.status(404).send({ error: 'User profile not found' });
      if (request.method === 'POST') {
        const result = await profilesCollection.updateOne({ userId }, { $addToSet: { bookmarks: listingId } });
        if (result.matchedCount === 0) return reply.status(404).send({ error: 'User not found' });
        return reply.send({ success: true, message: 'Bookmark added' });
      } else if (request.method === 'DELETE') {
        const result = await profilesCollection.updateOne({ userId }, { $pull: { bookmarks: listingId } });
        if (result.matchedCount === 0) return reply.status(404).send({ error: 'User not found' });
        return reply.send({ success: true, message: 'Bookmark removed' });
      }
    } catch (error) {
      fastify.log.error('Bookmark operation error:', error);
      return reply.status(500).send({ error: error.message || 'Failed to update bookmark' });
    }
  }
});

fastify.get('/bookmarks', async (request, reply) => {
  const { userId } = request.query;
  if (!userId) return reply.status(400).send({ error: 'userId is required' });
  try {
    const db = client.db('PFE');
    const profilesCollection = db.collection('profiles');
    const listingsCollection = db.collection('listings');
    const bucket = new GridFSBucket(db, { bucketName: 'photos' });
    const profile = await profilesCollection.findOne({ userId });
    if (!profile) return reply.status(404).send({ error: 'User profile not found' });
    const bookmarkListingIds = profile.bookmarks || [];
    const bookmarkedListings = bookmarkListingIds.length > 0 ? await listingsCollection.find({ listingId: { $in: bookmarkListingIds } }).toArray() : [];
    const processPhotos = async (listing) => {
      if (listing.photos && listing.photos.length > 0) {
        const photoBuffers = [];
        for (const photoId of listing.photos) {
          const downloadStream = bucket.openDownloadStreamByName(photoId);
          const chunks = [];
          await new Promise((resolve, reject) => {
            downloadStream.on('data', chunk => chunks.push(chunk));
            downloadStream.on('end', () => {
              photoBuffers.push(`data:image/jpeg;base64,${Buffer.concat(chunks).toString('base64')}`);
              resolve();
            });
            downloadStream.on('error', reject);
          });
        }
        listing.photos = photoBuffers;
      }
      return listing;
    };
    const processedListings = await Promise.all(bookmarkedListings.map(async (listing) => ({ ...await processPhotos(listing), id: listing.listingId })));
    return reply.send(processedListings);
  } catch (error) {
    fastify.log.error('Bookmarks fetch error:', error);
    return reply.status(500).send({ error: error.message || 'Failed to fetch bookmarks' });
  }
});



const start = async () => {
  try {
    await connectToDatabase();
    await fastify.listen({ port: 5000, host: '0.0.0.0' });
    console.log('Server is running on http://localhost:5000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();






