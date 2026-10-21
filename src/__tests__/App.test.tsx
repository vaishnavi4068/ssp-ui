import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { App } from '../App';

describe('SPP Portal UI MVP Integration', () => {
  beforeEach(() => {
    window.location.hash = '';
    vi.restoreAllMocks();
  });

  it('renders Shell with SPP Portal header and left navigation (Catalog, My Requests, Approvals, Resources)', () => {
    render(<App />);
    expect(screen.getByTestId('app-header-title')).toHaveTextContent('SPP Portal');
    expect(screen.getByTestId('nav-catalog')).toHaveTextContent('Catalog');
    expect(screen.getByTestId('nav-my-requests')).toHaveTextContent('My Requests');
    expect(screen.getByTestId('nav-approvals')).toHaveTextContent('Approvals');
    expect(screen.getByTestId('nav-resources')).toHaveTextContent('Resources');
  });

  it('renders Service Catalog cards from ADR-GLB-009 with GCS Bucket enabled and Spanner coming soon', () => {
    render(<App />);
    expect(screen.getByTestId('catalog-card-gcs_bucket')).toBeInTheDocument();
    expect(screen.getByTestId('catalog-card-spanner_instance')).toBeInTheDocument();
    expect(screen.getByTestId('catalog-card-spanner_database')).toBeInTheDocument();

    expect(screen.getByTestId('request-btn-gcs_bucket')).not.toBeDisabled();
    expect(screen.getByTestId('request-btn-spanner_instance')).toBeDisabled();
    expect(screen.getByTestId('request-btn-spanner_database')).toBeDisabled();
  });

  it('updates live bucket name and requested JSON preview in GCS Bucket Request Form and shows Control plane not deployed yet on unreachable API', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Failed to fetch'));

    render(<App />);
    fireEvent.click(screen.getByTestId('request-btn-gcs_bucket'));

    expect(screen.getByTestId('gcs-request-form')).toBeInTheDocument();
    expect(screen.getByTestId('live-bucket-name')).toHaveTextContent(
      'spp-nonprod-orders-landing-a1b2'
    );

    const purposeInput = screen.getByTestId('input-purpose-token');
    fireEvent.change(purposeInput, { target: { value: 'events' } });

    const apmInput = screen.getByTestId('input-apm-id') as HTMLInputElement;
    fireEvent.change(apmInput, { target: { value: 'apm54321' } });
    expect(apmInput.value).toBe('APM54321');
    expect(screen.getByTestId('requested-json-preview')).toHaveTextContent(
      '"apm_id": "apm54321"'
    );

    expect(screen.getByTestId('live-bucket-name')).toHaveTextContent(
      'spp-nonprod-orders-events-a1b2'
    );
    expect(screen.getByTestId('requested-json-preview')).toHaveTextContent(
      '"name": "spp-nonprod-orders-events-a1b2"'
    );

    fireEvent.click(screen.getByTestId('submit-request-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('submit-outcome-banner')).toHaveTextContent(
        'Control plane not deployed yet'
      );
    });
    // Ensures requested JSON preview is retained
    expect(screen.getByTestId('requested-json-preview')).toHaveTextContent(
      '"name": "spp-nonprod-orders-events-a1b2"'
    );
  });

  it('renders clean empty states on My Requests, Approvals, and Resources with no fake data', () => {
    render(<App />);

    fireEvent.click(screen.getByTestId('nav-my-requests'));
    expect(screen.getByTestId('empty-page-requests')).toHaveTextContent(
      'Control plane not deployed yet'
    );

    fireEvent.click(screen.getByTestId('nav-approvals'));
    expect(screen.getByTestId('empty-page-approvals')).toHaveTextContent(
      'Control plane not deployed yet'
    );

    fireEvent.click(screen.getByTestId('nav-resources'));
    expect(screen.getByTestId('empty-page-resources')).toHaveTextContent(
      'Control plane not deployed yet'
    );
  });
});
