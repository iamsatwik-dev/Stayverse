const express = require("express");
const router = express.Router({ mergeParams: true });
const wrapAsync = require("../utils/wrapAsync.js");
const Listing = require("../models/listing.js");
const Review = require("../models/review.js");
const { isLoggedIn } = require("../middleware.js");

// Create Review
router.post("/", isLoggedIn, wrapAsync(async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) {
    req.flash("error", "Listing not found!");
    return res.redirect("/listings");
  }

  const newReview = new Review(req.body.review);
  newReview.author = req.user._id;

  listing.reviews.push(newReview);
  await newReview.save();
  await listing.save();

  req.flash("success", "Review added successfully!");
  res.redirect(`/listings/${listing._id}`);
}));

// Delete Review
router.delete("/:reviewId", isLoggedIn, wrapAsync(async (req, res) => {
  let { id, reviewId } = req.params;

  const review = await Review.findById(reviewId);
  if (!review) {
    req.flash("error", "Review not found!");
    return res.redirect(`/listings/${id}`);
  }

  // Only the review author can delete their review
  if (!review.author.equals(req.user._id)) {
    req.flash("error", "You are not the author of this review!");
    return res.redirect(`/listings/${id}`);
  }

  await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
  await Review.findByIdAndDelete(reviewId);

  req.flash("success", "Review deleted!");
  res.redirect(`/listings/${id}`);
}));

module.exports = router;
