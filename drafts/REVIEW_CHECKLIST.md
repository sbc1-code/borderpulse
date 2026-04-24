# Mode A draft review checklist

Every auto-generated draft in `drafts/blog/auto-a/` must pass this checklist before it moves to `src/content/blog/` and ships.

The build blocks publish automatically: `build-blog-index.mjs` rejects any `data-analysis` post with `source != human` and `humanEdited: false`. The checklist is what flips that flag.

## Before flipping humanEdited to true

1. **Headline.** Rewrite it. Never ship the model's headline. Lead with the port and the finding, no clickbait.
2. **Lede.** Rewrite the first two sentences in your own voice.
3. **Numbers.** Open the port's aggregate JSON (`public/data/aggregates/<slug>.json`) and verify every number in the body matches the source. If anything is off by even one minute, rewrite or remove.
4. **Official source callouts.** Click every `<OfficialSource url="...">` link. Confirm it loads and the content still matches what the blurb says.
5. **Em dashes.** Search the file. Delete any that slipped through. No em dashes anywhere.
6. **Skill and certainty.** No inflated claims, no "comprehensive" or "definitive" language. Ranges and confidence should be honest.
7. **Local color.** Add at least one observation only a human knows about this port, this time of year, this pattern. The model has zero ground truth beyond the JSON.
8. **Description length.** 80 to 180 chars. Validator will reject outside that range.
9. **Slug collision.** The slug must not match any crossing slug and must not duplicate an existing blog slug.
10. **Flip the flags.**
    - Set `humanEdited: true`.
    - Set `draft: false`.
11. **Move the file** from `drafts/blog/auto-a/` to `src/content/blog/`.
12. **Local build.** `npm run build` must pass. If it doesn't, the frontmatter or slug is wrong.
13. **Commit and push.** GH Pages deploys on merge.

## Reject a draft outright when

- The evidence in the aggregate is too thin: fewer than 3 samples per cell, or the finding is noise within normal variance.
- The anomaly is boring: "Tuesday morning was quiet again" is not a post.
- The model invented a number or rule that is not in the source JSON.
- The model explained a program rule in its own words instead of using an `<OfficialSource>` callout.

Delete the file from `drafts/blog/auto-a/` and move on. The automation will try again tomorrow.
