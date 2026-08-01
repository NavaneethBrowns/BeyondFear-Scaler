import { Button } from './Button';

export const PaymentModal = ({
  open,
  plans = [],
  loading = false,
  paymentLoading = false,
  selectedPlanType = '',
  onClose,
  onSelectPlan,
}) => {
  if (!open) return null;

  return (
    <div className="payment-modal-overlay" role="dialog" aria-modal="true" aria-label="Upgrade to Premium">
      <div className="payment-modal-card">
        <div className="payment-modal-header">
          <h3>Upgrade to Premium</h3>
          <p>Unlock unlimited guided sessions and continue your progress.</p>
        </div>

        {loading ? (
          <div className="payment-modal-loading">Loading plans...</div>
        ) : (
          <div className="payment-plan-grid">
            {plans.map((plan) => {
              const isSelected = selectedPlanType === plan.planType;
              return (
                <article
                  key={plan.planType}
                  className={`payment-plan-card ${isSelected ? 'payment-plan-card-selected' : ''}`}
                >
                  <div className="payment-plan-top">
                    <h4>{plan.name}</h4>
                    {plan.discount ? <span className="payment-plan-discount">{plan.discount} off</span> : null}
                  </div>
                  <p className="payment-plan-amount">{plan.displayAmount}</p>
                  <p className="payment-plan-desc">{plan.description}</p>

                  <Button
                    variant="action"
                    size="sm"
                    onClick={() => onSelectPlan(plan.planType)}
                    disabled={paymentLoading}
                    className="payment-plan-btn"
                  >
                    {paymentLoading && isSelected ? 'Opening Checkout...' : 'Choose Plan'}
                  </Button>
                </article>
              );
            })}
          </div>
        )}

        <div className="payment-modal-actions">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={paymentLoading}>
            Maybe later
          </Button>
        </div>
      </div>
    </div>
  );
};
