const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const { v4: uuidv4 } = require('uuid');
const session = require('express-session');
const path = require('path');
const methodOverride = require('method-override');

const app = express();
const port = 3030;

app.set("view engine","ejs");
app.set("views",path.join(__dirname,"/views"));
app.use(express.urlencoded({extended : true}));
app.use(methodOverride("_method"));
app.use(express.static('public'));

// Parse JSON bodies
app.use(bodyParser.json());

// MySQL Connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'ayush', //your password
  database: 'voting' //your 
});
app.listen(port,()=>{
    console.log(`server started on port ${port}`);
  })

 
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL database:', err);
    return;
  }
  console.log('Connected to MySQL database.');
});
app.use(session({
    secret: 'Ayush', //add your key
    resave: false,
    saveUninitialized: true
  }));

app.get("/",(req,res)=>
{
res.render("signup.ejs");
});

// Handle Sign Up Form Submission
app.post('/signup', (req, res) => {
    const { username, password, r_question, ans } = req.body;
    const userId = uuidv4(); // Generate unique user ID
    const sql = `INSERT INTO voters (id, username, password, r_question, ans) VALUES (?, ?, ?, ?, ?)`;
    connection.query(sql, [userId, username, password, r_question, ans], (err, result) => {
        if (err) {
            console.error('Error signing up:', err);
            res.send(`<script>
            alert('An error occurred while signing up');
            window.location.href = document.referrer;
        </script>`);
            //res.status(500).json({ error: 'An error occurred while signing up' });
            return;
        }
        console.log('User signed up successfully');
        res.render("login.ejs");
    });
});

app.get("/login",(req,res)=>
{
    res.render("login.ejs");
})
// Voter Login API
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const sql = `SELECT * FROM voters WHERE username = ? AND password = ?`;
  connection.query(sql, [username, password], (err, result) => {
    if (err) {
      console.error('Error logging in:', err);
      res.send(`<script>
            alert('An error occurred while signing up');
            window.location.href = document.referrer;
        </script>`);
      //res.status(500).json({ error: 'An error occurred while logging in' });
      return;
    }
    if (result.length === 0) {
     // res.status(401).json({ error: 'Invalid username or password' });
     res.send(`<script>
            alert('Invalid username or password');
            window.location.href = document.referrer;
        </script>`);
      return;
    }
    req.session.user = {
        id: result[0].id,
        username: result[0].username
      };
    console.log('User logged in successfully');
    //res.status(200).json({ message: 'Login successful' });
    res.redirect('/home');
  });
});

app.get("/forgot-password",(req,res)=>
{
    res.render("forgot-password.ejs")
})

// Handle Forgot Password Form Submission
app.post('/forgot-password', (req, res) => {
    const { username, recoveryAnswer } = req.body;

    // Retrieve user information and recovery question from the database
    const getUserSql = `
        SELECT password, r_question, ans
        FROM voters
        WHERE username = ?
    `;
    connection.query(getUserSql, [username], (err, results) => {
        if (err) {
            console.error('Error retrieving user:', err);
            res.send(`<script>
            alert('An error occurred while retrieving user information');
            window.location.href = document.referrer;
        </script>`);
            //res.status(500).send('An error occurred while retrieving user information');
            return;
        }

        if (results.length === 0) {
           // res.status(400).send('User not found');
           res.send(`<script>
            alert('User not found');
            window.location.href = document.referrer;
        </script>`);
            return;
        }

        const user = results[0];
        const correctAnswer = user.ans;

        // Validate recovery answer
        if (recoveryAnswer === correctAnswer) {
            // If answer is correct, display password
            res.send(`<script>
            alert('Your password is: ${user.password}');
            window.location.href = document.referrer;
        </script>`);
        
        } else {
            // If answer is incorrect, display error message
            //res.status(400).send('Incorrect recovery answer');
            res.send(`<script>
            alert('Incorrect recovery answer');
            window.location.href = document.referrer;
        </script>`);
        }
    });
});

app.get('/home', (req, res) => {
    // Access user information from session
    const user = req.session.user;
    if (!user) {
      res.redirect('/login'); // Redirect to login if user not logged in
      return;
    }
    res.render('home', { user });
  });
  app.post('/logout', (req, res) => {
    // Destroy the session
    req.session.destroy(err => {
        if (err) {
            return res.send(`<script>
            alert('error in Server');
            window.location.href = document.referrer;
        </script>`);
        }
        // Redirect to login page or any other appropriate action
        res.redirect('/login');
    });
});
  
app.get('/create-poll', (req, res) => {
    // Check if user is logged in
    const user = req.session.user;
    if (!user) {
      res.redirect('/login');
      return;
    }
  
    res.render('create-poll.ejs', { user });
  });
  // Handle Poll Creation Form Submission
app.post('/create-poll', (req, res) => {
    const user = req.session.user;
    if (!user) {
      res.redirect('/login');
      return;
    }
  
    const { question, numOptions } = req.body;
    const pollId = uuidv4(); // Generate UUID for poll
    const options = [];
    for (let i = 1; i <= numOptions; i++) {
      const option = req.body[`option${i}`];
      options.push({ id: uuidv4(), text: option }); // Generate UUID for each option
    }
  
    // Insert poll question into Poll table
    const pollSql = `INSERT INTO Poll (poll_id, id, question) VALUES (?, ?, ?)`;
    connection.query(pollSql, [pollId, user.id, question], (err, result) => {
      if (err) {
        console.error('Error creating poll:', err);
       // res.status(500).json({ error: 'An error occurred while creating the poll' });
       res.send(`<script>
            alert('An error occurred while creating the poll');
            window.location.href = document.referrer;
        </script>`);
        return;
      }
  
      // Insert options into Option table
      const optionSql = `INSERT INTO Options (poll_id, option_id, option_text) VALUES ?`;
      const optionValues = options.map(option => [pollId, option.id, option.text]);
      connection.query(optionSql, [optionValues], (err, result) => {
        if (err) {
          console.error('Error creating options:', err);
         // res.status(500).json({ error: 'An error occurred while creating the options' });
         res.send(`<script>
            alert('An error occurred while creating the options');
            window.location.href = document.referrer;
        </script>`);
          return;
        }
        console.log('Poll and options created successfully');
        console.log('Poll ID:', pollId);
        console.log('Options:', options);
        //res.status(200).json({ message: 'Poll created successfully' });
        res.send(`<script>
            alert('Poll is Created Successfull');
            window.location.href = "voting-events";
;
        </script>`);
      });
    });
  });
  
 // Render Voting Events Page
app.get('/voting-events', (req, res) => {
    const user = req.session.user;
    if (!user) {
      res.redirect('/login');
      return;
    }
  
    // Retrieve data from Poll and Options tables
    const sql = `
      SELECT Poll.poll_id, Poll.question, Options.option_id, Options.option_text
      FROM Poll
      INNER JOIN Options ON Poll.poll_id = Options.poll_id
    `;
    connection.query(sql, (err, results) => {
      if (err) {
        console.error('Error retrieving voting events:', err);
        //res.status(500).json({ error: 'An error occurred while retrieving voting events' });
        res.send(`<script>
            alert('An error occurred while retrieving voting events');
            window.location.href = document.referrer;
        </script>`);
        return;
      }
      
      // Organize data into an object for rendering
      const questions = {};
      results.forEach(row => {
        if (!questions[row.poll_id]) {
          questions[row.poll_id] = {
            poll_id: row.poll_id,
            question: row.question,
            options: []
          };
        }
        questions[row.poll_id].options.push({
          option_id: row.option_id,
          option_text: row.option_text
        });
      });
  
      // Convert object to array for easier iteration in the EJS template
      const questionsArray = Object.values(questions);
  
      res.render('voting-events', { user, questions: questionsArray });
    });
  });


// Handle Vote Submission
app.post('/vote', (req, res) => {
    const user = req.session.user;
    if (!user) {
      res.redirect('/login'); // Redirect to login if user not logged in
      return;
    }
    const { poll_id, id, option_id } = req.body;
  
    // Check if the user has already voted on this question
    const checkVoteSql = `
      SELECT COUNT(*) AS count FROM Vote 
      WHERE poll_id = ? AND id = ?
    `;
    connection.query(checkVoteSql, [poll_id, id], (err, results) => {
      if (err) {
        console.error('Error checking vote:', err);
        //res.status(500).json({ error: 'An error occurred while checking vote' });
        res.send(`<script>
            alert('An error occurred while checking vote');
            window.location.href = document.referrer;
        </script>`);
        return;
      }
      const voteCount = results[0].count;
  
      if (voteCount > 0) {
        res.status(403).json({ error: 'You have already voted on this question' });
        return;
      }
  
      // Generate UUID for vote_id
      const vote_id = uuidv4();
  
      // Insert vote into Vote table
      const voteSql = `
        INSERT INTO Vote (vote_id, id, poll_id, option_id) 
        VALUES (?, ?, ?, ?)
      `;
      connection.query(voteSql, [vote_id, id, poll_id, option_id], (err, result) => {
        if (err) {
          console.error('Error creating vote:', err);
          //res.status(500).json({ error: 'An error occurred while creating the vote' });
          res.send(`<script>
            alert('An error occurred while creating the vote');
            window.location.href = document.referrer;
        </script>`);
          return;
        }
        console.log('Vote created successfully');
        console.log('Vote ID:', vote_id);
        console.log('Poll ID:', poll_id);
        console.log('User ID:', id);
        console.log('Option ID:', option_id);
       // res.status(200).json({ message: 'Vote submitted successfully' });
       res.render("home.ejs",{user})
      });
    });
  });
// Handle Poll Deletion
app.post('/delete/:poll_id', (req, res) => {
    const user = req.session.user;
    if (!user) {
      res.redirect('/login');
      return;
    }
  
    const poll_id = req.params.poll_id;
  
    // Delete votes related to the poll
    const deleteVotesSql = `
      DELETE FROM Vote WHERE poll_id = ?
    `;
    connection.query(deleteVotesSql, [poll_id], (err, result) => {
      if (err) {
        console.error('Error deleting votes:', err);
       // res.status(500).json({ error: 'An error occurred while deleting votes' });
       res.send(`<script>
            alert('An error occurred while deleting votes');
            window.location.href = document.referrer;
        </script>`);
        return;
      }
  
      // Delete options related to the poll
      const deleteOptionsSql = `
        DELETE FROM Options WHERE poll_id = ?
      `;
      connection.query(deleteOptionsSql, [poll_id], (err, result) => {
        if (err) {
          console.error('Error deleting options:', err);
          //res.status(500).json({ error: 'An error occurred while deleting options' });
          res.send(`<script>
            alert('An error occurred while deleting options');
            window.location.href = document.referrer;
        </script>`);
          return;
        }
  
        // Delete the poll itself
        const deletePollSql = `
          DELETE FROM Poll WHERE poll_id = ? AND id = ?
        `;
        connection.query(deletePollSql, [poll_id, user.id], (err, result) => {
          if (err) {
            console.error('Error deleting poll:', err);
            //res.status(500).json({ error: 'An error occurred while deleting the poll' });
            res.send(`<script>
            alert('An error occurred while deleting options');
            window.location.href = document.referrer;
        </script>`);
            return;
          }
          console.log('Poll and related data deleted successfully');
          res.redirect('/delete');
        });
      });
    });
  });
  
  // Render Delete Page
  app.get('/delete', (req, res) => {
    const user = req.session.user;
    if (!user) {
      res.redirect('/login');
      return;
    }
  
    // Retrieve polls created by the current user
    const pollSql = `SELECT * FROM Poll WHERE id = ?`;
    connection.query(pollSql, [user.id], (err, results) => {
      if (err) {
        console.error('Error retrieving polls:', err);
        //res.status(500).json({ error: 'An error occurred while retrieving polls' });
        res.send(`<script>
            alert('An error occurred while retrieving polls');
            window.location.href = document.referrer;
        </script>`);
        return;
      }
      const polls = results;
  
      res.render('delete.ejs', { user, polls });
    });
  });
    
  // Handle My Events Page
app.get('/my-events', (req, res) => {
    const user = req.session.user;
    if (!user) {
      res.redirect('/login');
      return;
    }
  
    // Retrieve polls created by the current user
    const myPollsSql = `SELECT * FROM Poll WHERE id = ?`;
    connection.query(myPollsSql, [user.id], (err, results) => {
      if (err) {
        console.error('Error retrieving polls:', err);
        //res.status(500).json({ error: 'An error occurred while retrieving polls' });
        res.send(`<script>
            alert('An error occurred while retrieving polls');
            window.location.href = document.referrer;
        </script>`);
        return;
      }
      const polls = results;
  
      res.render('my-events', { user, polls });
    });
  });
  
// Handle Poll Result
app.get('/result/:poll_id', (req, res) => {
    const user = req.session.user;
    if (!user) {
      res.redirect('/login');
      return;
    }
  
    const poll_id = req.params.poll_id;
  
    // Retrieve poll question
    const pollSql = `SELECT question FROM Poll WHERE poll_id = ? AND id = ?`;
    connection.query(pollSql, [poll_id, user.id], (err, pollResult) => {
      if (err) {
        console.error('Error retrieving poll question:', err);
       // res.status(500).json({ error: 'An error occurred while retrieving the poll question' });
       res.send(`<script>
            alert('An error occurred while retrieving the poll question');
            window.location.href = document.referrer;
        </script>`);
        return;
      }
      const question = pollResult[0].question;
  
      // Retrieve options and count votes for each option
      const optionsSql = `
        SELECT Options.option_text, COUNT(Vote.vote_id) AS vote_count
        FROM Options
        LEFT JOIN Vote ON Options.option_id = Vote.option_id
        WHERE Options.poll_id = ?
        GROUP BY Options.option_id
      `;
      connection.query(optionsSql, [poll_id], (err, optionsResult) => {
        if (err) {
          console.error('Error retrieving options and vote counts:', err);
         // res.status(500).json({ error: 'An error occurred while retrieving options and vote counts' });
         res.send(`<script>
            alert('An error occurred while retrieving options and vote count');
            window.location.href = document.referrer;
        </script>`);
          return;
        }
  
        // Render result page with poll question and vote counts for each option
        res.render('result', { user, question, options: optionsResult });
      });
    });
  });
  // Handle Option Voters
// Handle Option Voters
app.post('/option-voters', (req, res) => {
    const user = req.session.user;
    if (!user) {
      res.redirect('/login'); // Redirect to login if user not logged in
      return;
    }
    const option_id = req.body.option_id;
  
    // Retrieve voters for the selected option
    const votersSql = `
      SELECT voters.username
      FROM Vote
      INNER JOIN voters ON Vote.id = voters.id
      WHERE Vote.option_id = ?
    `;
    connection.query(votersSql, [option_id], (err, results) => {
      if (err) {
        console.error('Error retrieving voters:', err);
       // res.status(500).json({ error: 'An error occurred while retrieving voters' });
       res.send(`<script>
            alert('An error occurred while retrieving voters');
            window.location.href = document.referrer;
        </script>`);
        return;
      }
      const voters = results.map(result => result.username);
      console.log("Option ID:", option_id);
      console.log("Voters:", voters);
      res.render("show-voters",{ option_id, voters });
    });
});

  
