import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../auth/AuthContext';

export default function ProcurementReconciliation() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useContext(AuthContext);
  
  // Procurement data structure
  const [procurementData, setProcurementData] = useState({
    reconciliation: {
      totalContracts: 0,
      completedContracts: 0,
      pendingContracts: 0,
      contractValue: 0,
      paymentsMade: 0,
      paymentsPending: 0,
      reconciliationRate: 0
    },
    supplyChain: {
      sourcingLog: [],
      totalVolume: 0,
      totalValue: 0,
      averagePrice: 0,
      totalTransactions: 0
    },
    contracts: {
      active: [],
      completed: 0,
      pending: 0,
      disputed: 0
    },
    financial: {
      projectedExpenses: 0,
      totalBudget: 0,
      spent: 0,
      remaining: 0,
      costPerTon: 0,
      emergencyProcurement: 0
    },
    forecasts: {
      demand: { monthly: 0, quarterly: 0, annual: 0 },
      supply: { monthly: 0, quarterly: 0, annual: 0 },
      shortfall: { monthly: 0, quarterly: 0, annual: 0 }
    }
  });

  useEffect(() => {
    fetchProcurementData();
  }, []);

  const fetchProcurementData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      console.log('Fetching procurement data...');
      
      if (!token) {
        setError('No authentication token found. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await axios.get('http://localhost:4000/api/dashboard/procurement', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Procurement API Response:', response.data);
      
      setData(response.data);
      
      // Update procurement data from API response
      if (response.data.procurement) {
        setProcurementData(response.data.procurement);
      }
      
    } catch (error) {
      console.error('Error fetching procurement data:', error);
      console.error('Error details:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else if (error.response?.status === 403) {
        setError('You do not have permission to access procurement data.');
      } else if (error.response?.status === 404) {
        setError('Procurement data not found.');
      } else if (error.response?.data?.error) {
        setError(`Server error: ${error.response.data.error}`);
      } else if (error.message === 'Network Error') {
        setError('Cannot connect to server. Please check if backend is running.');
      } else {
        setError('Failed to load procurement data. Please try again.');
      }
      
      // Use comprehensive mock data as fallback
      setProcurementData({
        reconciliation: {
          totalContracts: 24,
          completedContracts: 18,
          pendingContracts: 6,
          contractValue: 185000,
          paymentsMade: 125000,
          paymentsPending: 60000,
          reconciliationRate: 75
        },
        supplyChain: {
          sourcingLog: [
            { 
              date: '2024-12-15', 
              name: 'John Doe', 
              variety: 'Shangi', 
              quantityDelivered: 500, 
              qtyAccepted: 490, 
              qtyRejected: 10, 
              reason: 'Quality Issues', 
              price: 120, 
              source: 'Contracted', 
              score: 95,
              status: 'Reconciled'
            },
            { 
              date: '2024-12-10', 
              name: 'Jane Smith', 
              variety: 'Challenger', 
              quantityDelivered: 300, 
              qtyAccepted: 295, 
              qtyRejected: 5, 
              reason: 'Size Specification', 
              price: 110, 
              source: 'Farmers Market', 
              score: 92,
              status: 'Pending'
            },
            { 
              date: '2024-12-05', 
              name: 'Samuel Kariuki', 
              variety: 'Shangi', 
              quantityDelivered: 450, 
              qtyAccepted: 445, 
              qtyRejected: 5, 
              reason: 'Weight Discrepancy', 
              price: 125, 
              source: 'Other Aggregator', 
              score: 88,
              status: 'Reconciled'
            }
          ],
          totalVolume: 1250,
          totalValue: 142500,
          averagePrice: 114,
          totalTransactions: 3
        },
        contracts: {
          active: [
            { 
              farmer: 'John Doe', 
              variety: 'Shangi', 
              quantity: 1000,
              contractValue: 120000,
              fulfillment: 49,
              paymentStatus: 'Paid',
              reconciliationStatus: 'Complete'
            },
            { 
              farmer: 'Jane Smith', 
              variety: 'Challenger', 
              quantity: 500,
              contractValue: 55000,
              fulfillment: 59,
              paymentStatus: 'Partial',
              reconciliationStatus: 'Pending'
            },
            { 
              farmer: 'Samuel Kariuki', 
              variety: 'Shangi', 
              quantity: 750,
              contractValue: 90000,
              fulfillment: 59.3,
              paymentStatus: 'Pending',
              reconciliationStatus: 'In Progress'
            }
          ],
          completed: 12,
          pending: 3,
          disputed: 1
        },
        financial: {
          projectedExpenses: 45000,
          totalBudget: 200000,
          spent: 125000,
          remaining: 75000,
          costPerTon: 350,
          emergencyProcurement: 15000
        },
        forecasts: {
          demand: {
            monthly: 5000,
            quarterly: 15000,
            annual: 60000
          },
          supply: {
            monthly: 4800,
            quarterly: 14400,
            annual: 57600
          },
          shortfall: {
            monthly: 200,
            quarterly: 600,
            annual: 2400
          }
        }
      });
      
      setData({
        summary: {
          totalFarmers: 150,
          totalAcreage: 2847,
          averageYield: 2.8,
          riskExposure: 12000
        },
        user: {
          name: user?.firstName ? `${user.firstName} ${user.lastName}` : 'Procurement Officer',
          email: user?.email || 'procurement@example.com',
          role: 'procurement'
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    fetchProcurementData();
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading procurement data...</p>
          <p className="text-sm text-gray-500 mt-1">Fetching reconciliation information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-red-700 mb-2">Error Loading Data</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="space-x-3">
            <button 
              onClick={handleRetry}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Try Again
            </button>
            <button 
              onClick={() => {
                setError(null);
                // Continue with mock data already loaded
              }}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Continue with Demo Data
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Debug info (remove in production)
  const showDebugInfo = process.env.NODE_ENV === 'development';

  return (
    <div className="p-6 space-y-6">
      {/* Debug Info */}
      {showDebugInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
          <p className="font-medium text-blue-800">Debug Info:</p>
          <p>Data loaded: {data ? 'Yes' : 'No'}</p>
          <p>Contracts: {procurementData.reconciliation.totalContracts}</p>
          <p>Reconciliation Rate: {procurementData.reconciliation.reconciliationRate}%</p>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Procurement Reconciliation Dashboard</h1>
          <p className="text-gray-600">Manage contracts, sourcing, and financial reconciliation</p>
          {data?.user && (
            <p className="text-sm text-gray-500 mt-1">
              User: <span className="font-medium">{data.user.name}</span> | 
              Role: <span className="font-medium">{data.user.role}</span>
            </p>
          )}
        </div>
        <button 
          onClick={fetchProcurementData}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold text-gray-700 text-sm">Total Contracts</h3>
          <p className="text-2xl font-bold">{procurementData.reconciliation.totalContracts}</p>
          <p className="text-xs text-gray-500 mt-1">
            {procurementData.reconciliation.completedContracts} completed • {procurementData.reconciliation.pendingContracts} pending
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold text-gray-700 text-sm">Contract Value</h3>
          <p className="text-2xl font-bold">${procurementData.reconciliation.contractValue.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">
            ${procurementData.reconciliation.paymentsMade.toLocaleString()} paid • ${procurementData.reconciliation.paymentsPending.toLocaleString()} pending
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold text-gray-700 text-sm">Reconciliation Rate</h3>
          <p className="text-2xl font-bold text-green-600">{procurementData.reconciliation.reconciliationRate}%</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className="bg-green-500 h-2 rounded-full" 
              style={{width: `${procurementData.reconciliation.reconciliationRate}%`}}
            ></div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold text-gray-700 text-sm">Supply Volume</h3>
          <p className="text-2xl font-bold">{procurementData.supplyChain.totalVolume} tons</p>
          <p className="text-xs text-gray-500 mt-1">
            Avg: ${procurementData.supplyChain.averagePrice}/ton • {procurementData.supplyChain.totalTransactions} transactions
          </p>
        </div>
      </div>

      {/* Sourcing Log */}
      <section className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Sourcing Log</h2>
          <div className="flex items-center space-x-2">
            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
              {procurementData.supplyChain.sourcingLog.length} deliveries
            </span>
            <span className="text-sm text-gray-600">
              Total: {procurementData.supplyChain.totalVolume} tons • ${procurementData.supplyChain.totalValue.toLocaleString()}
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variety</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty Delivered</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty Accepted</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {procurementData.supplyChain.sourcingLog.map((log, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{log.date}</td>
                  <td className="px-4 py-3 text-sm font-medium">{log.name}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      {log.variety}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{log.quantityDelivered}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="font-medium">{log.qtyAccepted}</span>
                    {log.qtyRejected > 0 && (
                      <span className="ml-2 text-red-600 text-xs">(-{log.qtyRejected})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      log.status === 'Reconciled' ? 'bg-green-100 text-green-800' :
                      log.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">
                    ${(log.qtyAccepted * log.price).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Contracts & Financial */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Contracts */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Active Contracts</h2>
          <div className="space-y-4">
            {procurementData.contracts?.active?.map((contract, index) => (
              <div key={index} className="p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-lg">{contract.farmer}</h4>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {contract.variety}
                      </span>
                      <span className="text-sm text-gray-600">Contract: ${contract.contractValue?.toLocaleString()}</span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    contract.reconciliationStatus === 'Complete' ? 'bg-green-100 text-green-800' :
                    contract.reconciliationStatus === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {contract.reconciliationStatus}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Quantity</p>
                    <p className="font-medium">{contract.quantity} tons</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Fulfillment</p>
                    <div className="flex items-center">
                      <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{width: `${contract.fulfillment}%`}}
                        ></div>
                      </div>
                      <span className="font-medium">{contract.fulfillment}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-600">Payment</p>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      contract.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800' :
                      contract.paymentStatus === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {contract.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {(!procurementData.contracts?.active || procurementData.contracts.active.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <p>No active contracts to display</p>
                <p className="text-sm mt-1">Contracts will appear here once created</p>
              </div>
            )}
          </div>
          
          <div className="mt-4 pt-4 border-t text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Completed Contracts: <span className="font-bold">{procurementData.contracts?.completed || 0}</span></span>
              <span>Pending: <span className="font-bold">{procurementData.contracts?.pending || 0}</span></span>
              <span>Disputed: <span className="font-bold">{procurementData.contracts?.disputed || 0}</span></span>
            </div>
          </div>
        </section>

        {/* Financial Overview */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Financial Overview</h2>
          <div className="space-y-6">
            {/* Budget */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="font-medium">Budget Utilization</span>
                <span className="font-bold">
                  ${procurementData.financial.spent?.toLocaleString() || '0'} / ${procurementData.financial.totalBudget?.toLocaleString() || '0'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className="bg-blue-500 h-4 rounded-full" 
                  style={{width: `${(procurementData.financial.spent / procurementData.financial.totalBudget) * 100 || 0}%`}}
                ></div>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>Remaining: ${procurementData.financial.remaining?.toLocaleString() || '0'}</span>
                <span>{Math.round((procurementData.financial.spent / procurementData.financial.totalBudget) * 100) || 0}% spent</span>
              </div>
            </div>
            
            {/* Financial Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600">Projected Expenses</p>
                <p className="text-xl font-bold text-red-600">${procurementData.financial.projectedExpenses?.toLocaleString() || '0'}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Cost per Ton</p>
                <p className="text-xl font-bold text-blue-600">${procurementData.financial.costPerTon || '0'}</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-gray-600">Emergency Procurement</p>
                <p className="text-xl font-bold text-yellow-600">${procurementData.financial.emergencyProcurement?.toLocaleString() || '0'}</p>
              </div>
            </div>
            
            {/* Supply-Demand Forecast */}
            <div className="border rounded-lg p-4">
              <h3 className="font-bold mb-3">Supply-Demand Forecast</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Monthly Demand</span>
                    <span className="font-medium">{procurementData.forecasts?.demand?.monthly || 0} tons</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Monthly Supply</span>
                    <span className="font-medium">{procurementData.forecasts?.supply?.monthly || 0} tons</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Shortfall</span>
                    <span className="font-medium text-red-600">{procurementData.forecasts?.shortfall?.monthly || 0} tons</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Quick Actions */}
      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Procurement Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Reconcile Contracts
          </button>
          <button className="p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
            Generate Reconciliation Report
          </button>
          <button className="p-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center justify-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            View Payment Schedule
          </button>
        </div>
      </section>
    </div>
  );
}
