export const SubscriptionBadge = ({ subscriptionStatus = 'free', sessionsInfo = null }) => {
  const isPremium = subscriptionStatus === 'premium';

  return (
    <div className={`subscription-badge ${isPremium ? 'subscription-badge-premium' : 'subscription-badge-free'}`}>
      <span className="subscription-dot" />
      <span className="subscription-label">
        {isPremium
          ? 'Premium active'
          : `Free tier${sessionsInfo && !sessionsInfo.isUnlimited ? ` ${sessionsInfo.used}/${sessionsInfo.total}` : ''}`}
      </span>
    </div>
  );
};
