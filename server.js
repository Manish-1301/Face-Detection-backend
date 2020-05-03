const express=require('express')
const bodyparser=require('body-parser')
const bcrypt = require('bcryptjs');
const cors=require('cors');
const knex = require('knex');
const Clarifai=require('clarifai')

const db=knex({
	client: 'pg',
   	connection: {
    	host : '127.0.0.1',
    	user : '',
    	password : '',
    	database : ''
  }
});

const key= new Clarifai.App({
  apiKey:'YOUR_API_KEY_HERE'
})

const app=express();

app.use(cors());
app.use(bodyparser.json());

app.get('/',(req,res)=>{
	res.send(`It is working!!`)
});

app.post('/signin',(req,res)=>{
	//const{email,password}=req.body
	db.select('email','password').from('login').where('email','=',req.body.email)
	.returning('*')
	.then(data=>{
		const isValid=bcrypt.compareSync(req.body.password, data[0].password)
		if(isValid)
		{
			db.select('*').from('users').where('email','=',req.body.email)
			.returning('*')
			.then(user=>{
				res.json(user[0]);
				})
			.catch(err=>res.status(400).json("Error while comparing!!"))
		}
		else{
			res.status(400).json("Error!!")
		}
		
	})
	.catch(err=>{
		console.log(err);
		res.status(400).json("Error!!")
	})
})

app.post('/register',(req,res)=>{
	const {name,email,password}=req.body;
	const hash = bcrypt.hashSync(password, 8);
	db.transaction(trx=>{
		trx.insert({
			password:hash,
			email:email
		})
		.into('login')
		.returning('email')
		.then(loginEmail=>{
			return trx('users')
				.insert({
					email: loginEmail[0],
					name: name,
					joined :new Date()
				})
				.returning('*')
				.then(user=>{
					res.json(user[0]);
				})
		})
		.then(trx.commit)
		.catch(trx.rollback)
	})
	.catch(err=>{
		console.log(err);
		res.status(400).json("Error!!")
	})
})

app.get('/profile/:name',(req,res)=>{
	const {name}=req.params;
	db.select('*').from('users').where({name:name})
		.then( user=>{
			if(user.length)
				res.json(user[0]);
			else
				res.status(400).json("User does not exist");
		})
		.catch(err=>res.status(400).json("Error!!"))
})

app.put('/images',(req,res)=>{
	const {id}=req.body;
	db('users').where('id','=',id)
	.increment('entries',1)
	.returning('entries')
	.then(entries=>{
		res.json(entries[0]);
	})
	.catch(err=>res.status(400).json("Error!!"))
})

app.post('/imageUrl',(req,res)=>{
	key.models.predict(Clarifai.FACE_DETECT_MODEL,req.body.input )
    .then(data=>res.json(data))
    .catch (err => res.status(400).json("there was an error with Api call"));
})

app.listen(process.env.PORT || 3001,()=>{
	console.log(`App is running on ${process.env.PORT}`)
});