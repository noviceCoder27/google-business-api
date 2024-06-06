const express = require('express');
const axios = require('axios');
const querystring = require('querystring');
require('dotenv').config();

const app = express();
const port = 3000;

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;
const oauth2Endpoint = 'https://accounts.google.com/o/oauth2/auth';
const tokenEndpoint = 'https://oauth2.googleapis.com/token';

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/auth', (req, res) => {
  const authUrl = `${oauth2Endpoint}?${querystring.stringify({
    client_id,
    redirect_uri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/business.manage',
    access_type: 'offline',
    prompt: 'consent'
  })}`;
  res.redirect(authUrl);
});

app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  try {
    const response = await axios.post(tokenEndpoint, querystring.stringify({
      code,
      client_id,
      client_secret,
      redirect_uri,
      grant_type: 'authorization_code'
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    const tokens = response.data;
    res.redirect(`/accounts?access_token=${tokens.access_token}`);
  } catch (err) {
    console.error(err);
    res.send('Error retrieving access token');
  }
});

app.get('/accounts', async (req, res) => {
  const access_token = req.query.access_token;
  const accountsEndpoint = `https://mybusinessaccountmanagement.googleapis.com/v1/accounts`;

  try {
    const response = await axios.get(accountsEndpoint, {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });
    const accounts = response.data.accounts;
    if (accounts && accounts.length > 0) {
      const accountId = accounts[0].name.split('/')[1];
      res.redirect(`/locations?access_token=${access_token}&account_id=${accountId}`);
    } else {
      res.send('No accounts found');
    }
  } catch (err) {
    console.error('Error fetching accounts:', err.response ? err.response.data : err.message);
    res.send('Error fetching accounts');
  }
});

app.get('/locations', async (req, res) => {
  const access_token = req.query.access_token;
  const accountId = req.query.account_id;
  const locationsEndpoint = `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations`;

  try {
    const response = await axios.get(locationsEndpoint, {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });
    const locations = response.data.locations;
    if (locations && locations.length > 0) {
      const locationId = locations[0].name.split('/')[3];
      res.redirect(`/reviews?access_token=${access_token}&account_id=${accountId}&location_id=${locationId}`);
    } else {
      res.send('No locations found');
    }
  } catch (err) {
    console.error('Error fetching locations:', err.response ? err.response.data : err.message);
    res.send('Error fetching locations');
  }
});

app.get('/reviews', async (req, res) => {
  const access_token = req.query.access_token;
  const accountId = req.query.account_id;
  const locationId = req.query.location_id;
  const reviewsEndpoint = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews`;

  try {
    const response = await axios.get(reviewsEndpoint, {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });
    const reviews = response.data.reviews || [];
    res.render('reviews', { reviews, access_token, accountId, locationId });
  } catch (err) {
    console.error('Error fetching reviews:', err.response ? err.response.data : err.message);
    res.send('Error fetching reviews');
  }
});

app.post('/reply', async (req, res) => {
  const access_token = req.body.access_token;
  const accountId = req.body.account_id;
  const locationId = req.body.location_id;
  const reviewId = req.body.reviewId;
  const reply = req.body.reply;
  const replyEndpoint = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews/${reviewId}/reply`;

  try {
    const response = await axios.put(replyEndpoint, {
      comment: reply
    }, {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });
    res.redirect(`/reviews?access_token=${access_token}&account_id=${accountId}&location_id=${locationId}`);
  } catch (err) {
    console.error('Error posting reply:', err.response ? err.response.data : err.message);
    res.send('Error posting reply');
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
