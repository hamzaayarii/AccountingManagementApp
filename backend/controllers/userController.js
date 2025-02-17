var User = require('../models/user')


async function list(req,res,next){
    await User.find()
        .then((data, err)=>{
            if(err){
                res.status(503).json(err)
            }else{
                res.status(200).json(data)
            }
        })
}


const create =async (req,res,next)=>{
    const { fullName, email, password, phoneNumber, governorate, avatar, gender } = req.body
    console.log(req.body);
    await new User({
        fullName: fullName,
        email: email,
        password: password,
        phoneNumber: phoneNumber,
        governorate: governorate,
        avatar: avatar,
        gender: gender
    }).save()
        .then((err, data)=>{
            if(err){
                console.log("error create User : "+ err);
            }
            console.log(data);
        })
    res.status(200).json('User added ! Full Name : '+ fullName + ', Email : '+ email)
}


async function updateUser(req,res,next){
    req.body.updatedAt = new Date();
    User.findByIdAndUpdate(req.params.id,req.body)
        .then((data,err)=>{
            if(err){res.status(500).json(err)}
            res.status(200).json(data)
        })
}


const deleteUser =async(req,res,next)=>{
    try{
        const id =req.params.id
        const data =await User.findByIdAndDelete(id,req.body)
        if(!data){
            res.status(404).json("not found ... !")
        }

        res.status(203).json(data)
    }catch(err){
        res.status(500).json("error : "+err)
    }
}

module.exports = { create, list,updateUser, deleteUser }