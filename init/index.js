const mongoose= require("mongoose")
const initdata = require("./data")
const Listing= require("../models/listing") 
const MONGO_URL="mongodb://127.0.0.1:27017/Stayverse"
main()
.then(()=>{
    console.log("DB is connected")}
)
.catch(err => console.log(err));

const User = require("../models/user");

async function main() {
  await mongoose.connect(MONGO_URL);
}

const initDB = async () => {
    await Listing.deleteMany({});
    await User.deleteMany({});
    
    const newUser = new User({ email: "admin@stayverse.com", username: "admin" });
    const registeredUser = await User.register(newUser, "password");
    
    initdata.data = initdata.data.map((obj) => ({
        ...obj,
        owner: registeredUser._id,
        image: { url: obj.image, filename: "listingimage" },
        geometry: { type: "Point", coordinates: [77.2090, 28.6139] } // Default coordinates (New Delhi)
    }));
    
    await Listing.insertMany(initdata.data);
    console.log("data was initialized");
};

initDB();