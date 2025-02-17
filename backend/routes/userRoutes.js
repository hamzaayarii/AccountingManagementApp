var express = require('express')
var router = express.Router()
const { list, create ,updateUser,deleteUser} = require('../controllers/userController')

router.get('/list', list)
router.post('/create', create)
router.put('/update/:id',updateUser)
router.delete('/delete/:id',deleteUser)

module.exports = router