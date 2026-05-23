const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const Listing = require("../models/listing.js");
const QRCode = require("qrcode");
const { isLoggedIn, isOwner } = require("../middleware.js");

// Index Route (with search)
router.get("/", wrapAsync(async (req, res) => {
  let searchQuery = req.query.q || "";
  let allListings;

  if (searchQuery.trim()) {
    const regex = new RegExp(searchQuery.trim(), "i");
    allListings = await Listing.find({
      $or: [
        { title: regex },
        { location: regex },
        { country: regex },
      ],
    });
  } else {
    allListings = await Listing.find({});
  }

  res.render("listings/index", { allListings, searchQuery });
}));

// New Listing Form Route
router.get("/new", isLoggedIn, (req, res) => {
  res.render("listings/new");
});

// Show Route
router.get("/:id", wrapAsync(async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id)
    .populate({ path: "reviews", populate: { path: "author" } })
    .populate("owner");
  if (!listing) {
    req.flash("error", "Listing you requested for does not exist!");
    return res.redirect("/listings");
  }
  res.render("listings/show", { listing });
}));

// Create Route
router.post("/", isLoggedIn, wrapAsync(async (req, res, next) => {
  const newListing = new Listing(req.body.listing);
  newListing.owner = req.user._id;

  // Handle image: form sends a URL string, schema expects { url, filename }
  if (typeof req.body.listing.image === "string") {
    newListing.image = {
      url: req.body.listing.image || "https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b",
      filename: "listingimage",
    };
  }

  // Default geometry if not provided
  if (!newListing.geometry || !newListing.geometry.type) {
    newListing.geometry = { type: "Point", coordinates: [77.2090, 28.6139] };
  }

  await newListing.save();
  req.flash("success", "New Listing Created!");
  res.redirect("/listings");
}));

// Edit Route
router.get("/:id/edit", isLoggedIn, isOwner, wrapAsync(async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing you requested for does not exist!");
    return res.redirect("/listings");
  }
  res.render("listings/edit", { listing });
}));

// Update Route
router.put("/:id", isLoggedIn, isOwner, wrapAsync(async (req, res) => {
  let { id } = req.params;
  await Listing.findByIdAndUpdate(id, { ...req.body.listing });
  req.flash("success", "Listing Updated!");
  res.redirect(`/listings/${id}`);
}));

// Delete Route
router.delete("/:id", isLoggedIn, isOwner, wrapAsync(async (req, res) => {
  let { id } = req.params;
  let deletedListing = await Listing.findByIdAndDelete(id);
  req.flash("success", "Listing Deleted!");
  res.redirect("/listings");
}));

// Booking Page Route
router.get("/:id/book", isLoggedIn, wrapAsync(async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing you requested for does not exist!");
    return res.redirect("/listings");
  }

  // Block owner from booking their own listing
  if (listing.owner.equals(req.user._id)) {
    req.flash("error", "You cannot book your own listing!");
    return res.redirect(`/listings/${id}`);
  }

  // Generate UPI payment URI
  const upiId = "stayverse@upi";
  const payeeName = "Stayverse";
  const amount = listing.price;
  const upiURI = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent("Booking: " + listing.title)}`;

  // Generate QR code as base64 data URL
  const qrCodeDataURL = await QRCode.toDataURL(upiURI, {
    width: 280,
    margin: 2,
    color: {
      dark: "#222222",
      light: "#ffffff",
    },
  });

  res.render("listings/book", { listing, qrCodeDataURL, amount });
}));

// Confirm Booking Route
router.post("/:id/book/confirm", isLoggedIn, wrapAsync(async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing you requested for does not exist!");
    return res.redirect("/listings");
  }
  req.flash("success", `🎉 Booking confirmed for "${listing.title}"! Check your email for details.`);
  res.redirect(`/listings/${id}`);
}));

module.exports = router;
