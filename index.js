const express = require("express");
const cors = require("cors");
const app = express();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
require("dotenv").config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

app.use(express.json());
app.use(cookieParser());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@movies.yat9m.mongodb.net/?retryWrites=true&w=majority&appName=Movies`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    //job related api
    const jobsCollection = client.db("jobPortal").collection("jobs");
    const jobApplyCollection = client
      .db("jobPortal")
      .collection("job_applications");

    // Auth Related API
    //require('crypto').randomBytes(64).toString('hex')  use this node cmmd
    app.post("/jwt", async(req,res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, {expiresIn: '1h'});
      res
      .cookie('token', token,{
        httpOnly:true,
        secure:false
      })
      .send({success: true});

    })

    app.get("/jobs", async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { hr_email: email };
      }
      const cursor = jobsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/jobs", async (req, res) => {
      const newJob = req.body;
      const result = await jobsCollection.insertOne(newJob);
      res.send(result);
    });

    app.get("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.findOne(query);
      res.send(result);
    });

    app.post("/job-applications", async (req, res) => {
      const application = req.body;
      const result = await jobApplyCollection.insertOne(application);
      res.send(result);
    });

    app.patch("/job-applications/:id", async(req,res)=>{
      const id = req.params.id;
      const data = req.body;
      const filter = {_id: new ObjectId(id)};
      const updatedDoc = {
        $set:{
          status: data.status
        }
      }
      const result = await jobApplyCollection.updateOne(filter,updatedDoc)
      res.send(result)
    })

    app.get("/job-applications/jobPost/:id", async (req, res) => {
      const jobId = req.params.id;
      const query = { job_id: jobId };
      const result = await jobApplyCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/job-applies", async (req, res) => {
      const email = req.query.email;
      const query = { applicant_email: email };
      const result = await jobApplyCollection.find(query).toArray();

      const filteredJobs = await Promise.all(
        result.map(async (applications) => {
          const jobId = applications.job_id;
          const jobQuery = { _id: new ObjectId(jobId) };
          const getJobs = await jobsCollection.findOne(jobQuery);

          if (getJobs) {
            applications.title = getJobs.title;
            applications.company = getJobs.company;
            applications.location = getJobs.location;
            applications.jobType = getJobs.jobType;
            applications.salaryRange = getJobs.salaryRange;
            applications.company_logo = getJobs.company_logo;
            applications.requirements = getJobs.requirements;
            applications.applicationDeadline = getJobs.applicationDeadline;
          }
          return applications;
        })
      );
      res.send(filteredJobs);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Job Portal is running");
});

app.listen(port, () => {
  console.log(`job-portal server is running at http://localhost:${port}`);
});
