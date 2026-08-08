-- New accounts must not get dashboard access before they've actually gone
-- through Stripe Checkout: defaulting subscription_status to 'trialing'
-- meant anyone who signed up and then abandoned/cancelled the Checkout
-- redirect (never entered a card) still read as an active trial and got in
-- free, indefinitely. 'incomplete' is a real Stripe status value meaning
-- "no confirmed subscription yet" — the frontend's mapSubscriptionStatus
-- already treats anything other than 'trialing'/'active' as locked, so this
-- alone closes the loophole without any other code change. The Stripe
-- webhook (checkout.session.completed) overwrites this with the real status
-- once checkout actually completes.
--
-- Existing rows are untouched — this only changes the default applied to
-- rows inserted from now on.
alter table public.profiles
  alter column subscription_status set default 'incomplete';
