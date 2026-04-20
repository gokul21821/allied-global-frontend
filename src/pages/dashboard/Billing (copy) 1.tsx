import React, { useState, useEffect } from "react";
import { Plus, History } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import {
  getCustomerId,
  setupPaymentMethod,
  checkPaymentMethodSetup,
  createUserInFirebase,
  setupOneTimeTopUp,
  getUsageDetails,
  getUserInvoices,
  clearSingleInvoice,
  clearAllInvoices,
} from "../../lib/customers";
import { db } from "../../lib/firebase";

interface UserData {
  email: string;
  role: "admin" | "user";
  createdByAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
  stripeCustomerId?: string;
  hasToppedUp?: boolean;
}

const Billing: React.FC = () => {
  const { getEffectiveUser, user: actualUser, userData: actualUserData } = useAuth();
  const user = getEffectiveUser();
  const isAdmin = actualUserData?.role === "admin" || actualUserData?.role === "super-admin";

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [customerId, setCustomerId] = useState<string>("");
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false);
  const [isLoadingPaymentMethod, setIsLoadingPaymentMethod] = useState(false);
  const [paymentMethodError, setPaymentMethodError] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  // const [pastInvoices, setPastInvoices] = useState<any[]>([]);
  const [paidInvoices, setPaidInvoices] = useState<any[]>([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState<any[]>([]);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [totalUsage, setTotalUsage] = useState<number>(0);
  const [totalCalls, setTotalCalls] = useState<number>(0);
  const [nextInvoiceDate, setNextInvoiceDate] = useState<string>("");
  const [hasToppedUp, setHasToppedUp] = useState<boolean>(false);
  const [clearingInvoice, setClearingInvoice] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState<boolean>(false);
  const [clearMessage, setClearMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const getCurrentMonthLabel = () => {
    const now = new Date();
    return (
      " " +
      now.toLocaleString("default", { month: "long", year: "numeric" }) +
      " "
    );
  };
  const formatDateToDDMMYYYY = (isoDate: string): string => {
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are zero-based
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  useEffect(() => {
    const initializeData = async () => {
      const effectiveUser = getEffectiveUser();
      if (!effectiveUser) return;

      // Reset hasToppedUp to false for each effective user by default
      setHasToppedUp(false);

      try {
        const userDocRef = doc(db, "users", effectiveUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const data = userDoc.data() as UserData;
          setUserData(data);
          // Set hasToppedUp based on the specific effective user's data, defaulting to false
          setHasToppedUp(data.hasToppedUp || false);
        }

        let id = await getCustomerId(effectiveUser.uid);
        if (!id) {
          id = await createUserInFirebase(
            effectiveUser.email ?? "",
            effectiveUser.uid,
          );
        }

        if (id) {
          setCustomerId(id);

          const [paymentMethodStatus, usageDetails, userInvoices] =
            await Promise.all([
              // fetchCustomerInvoices(id),
              checkPaymentMethodSetup(id),
              getUsageDetails(effectiveUser.uid),
              getUserInvoices(effectiveUser.uid),
            ]);


          setHasPaymentMethod(paymentMethodStatus?.hasDynamicSetup || false);
          // setPastInvoices(invoices);
          setPaidInvoices(userInvoices.paidInvoices);
          setUnpaidInvoices(userInvoices.unpaidInvoices);
          setUserBalance(usageDetails.currentBalance ?? 0);
          setTotalUsage(usageDetails.totalUsage ?? 0);
          setTotalCalls(usageDetails.totalCalls ?? 0);
          setNextInvoiceDate(usageDetails.nextInvoiceDate || "");
        }
      } catch (error) {
        console.error("Error initializi ng data:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [user, getEffectiveUser]);

  const handleSetupPaymentMethod = async () => {
    const effectiveUser = getEffectiveUser();
    if (!effectiveUser || !effectiveUser.email || !customerId) return;

    setIsLoadingPaymentMethod(true);
    setPaymentMethodError(null);

    try {
      await setupPaymentMethod(
        effectiveUser.uid,
        effectiveUser.email,
        customerId,
      );
    } catch (error) {
      setPaymentMethodError(
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setIsLoadingPaymentMethod(false);
    }
  };

  const handleTopUp = async () => {
    const effectiveUser = getEffectiveUser();
    if (!effectiveUser || !customerId) return;

    try {
      const amount = 50;
      await setupOneTimeTopUp(
        effectiveUser.uid,
        amount,
        customerId,
        effectiveUser.email || "",
      );
    } catch (err) {
      console.error("Top-up failed", err);
      setError("Failed to process top-up. Please try again.");
    }
  };

  const handleClearInvoice = async (invoiceId: string) => {
    const effectiveUser = getEffectiveUser();
    if (!effectiveUser) return;

    if (!window.confirm(`Are you sure you want to clear invoice ${invoiceId}?`)) {
      return;
    }

    setClearingInvoice(invoiceId);
    setClearMessage(null);

    try {
      const result = await clearSingleInvoice(
        effectiveUser.uid,
        invoiceId,
        actualUser?.uid // Pass the admin's ID
      );

      if (result.success) {
        console.log(`Invoice ${invoiceId} cleared successfully, refreshing data...`);
        setClearMessage({
          type: "success",
          text: result.message || "Invoice cleared successfully",
        });

        // Refresh invoice data
        const userInvoices = await getUserInvoices(effectiveUser.uid);
        console.log("Refreshed invoices:", {
          paid: userInvoices.paidInvoices.length,
          unpaid: userInvoices.unpaidInvoices.length,
        });
        setPaidInvoices(userInvoices.paidInvoices);
        setUnpaidInvoices(userInvoices.unpaidInvoices);
      } else {
        setClearMessage({
          type: "error",
          text: result.message || "Failed to clear invoice",
        });
      }
    } catch (err) {
      console.error("Error clearing invoice:", err);
      setClearMessage({
        type: "error",
        text: "An error occurred while clearing the invoice",
      });
    } finally {
      setClearingInvoice(null);
      // Auto-hide message after 5 seconds
      setTimeout(() => setClearMessage(null), 5000);
    }
  };

  const handleClearAllInvoices = async () => {
    const effectiveUser = getEffectiveUser();
    if (!effectiveUser) return;

    if (
      !window.confirm(
        `Are you sure you want to clear ALL unpaid invoices for this user? This action cannot be undone.`
      )
    ) {
      return;
    }

    setClearingAll(true);
    setClearMessage(null);

    try {
      const result = await clearAllInvoices(
        effectiveUser.uid,
        actualUser?.uid // Pass the admin's ID
      );

      if (result.success) {
        console.log(`Cleared ${result.clearedCount || 0} invoice(s), refreshing data...`);
        setClearMessage({
          type: "success",
          text:
            result.message ||
            `Successfully cleared ${result.clearedCount || 0} invoice(s)`,
        });

        // Refresh invoice data
        const userInvoices = await getUserInvoices(effectiveUser.uid);
        console.log("Refreshed invoices after bulk clear:", {
          paid: userInvoices.paidInvoices.length,
          unpaid: userInvoices.unpaidInvoices.length,
        });
        setPaidInvoices(userInvoices.paidInvoices);
        setUnpaidInvoices(userInvoices.unpaidInvoices);
      } else {
        setClearMessage({
          type: "error",
          text: result.message || "Failed to clear invoices",
        });
      }
    } catch (err) {
      console.error("Error clearing all invoices:", err);
      setClearMessage({
        type: "error",
        text: "An error occurred while clearing invoices",
      });
    } finally {
      setClearingAll(false);
      // Auto-hide message after 5 seconds
      setTimeout(() => setClearMessage(null), 5000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Billing
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage top-ups and usage
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-6 bg-white dark:bg-dark-200 p-6 rounded-xl border border-gray-200 dark:border-dark-100">
          {!hasToppedUp && (
            <div>
              <button
                onClick={handleTopUp}
                className="bg-primary hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-semibold text-lg"
              >
                Add $50
              </button>
              {error && <p className="mt-2 text-red-600 text-sm">{error}</p>}
            </div>
          )}
          <div>
            {hasPaymentMethod ? (
              <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium">
                ✓ Payment method added
              </div>
            ) : (
              <button
                onClick={handleSetupPaymentMethod}
                disabled={isLoadingPaymentMethod}
                className="bg-primary hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium"
              >
                {isLoadingPaymentMethod ? (
                  "Loading..."
                ) : (
                  <div className="flex items-center gap-2">
                    <Plus size={16} /> Add Payment Method
                  </div>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Unpaid Invoices Alert */}
      {unpaidInvoices.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-red-800 dark:text-red-200">
              ⚠️ Unpaid Invoices
            </h2>
            {isAdmin && (
              <button
                onClick={handleClearAllInvoices}
                disabled={clearingAll}
                className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
              >
                {clearingAll ? "Clearing..." : "Clear All Unpaid Invoices"}
              </button>
            )}
          </div>

          {/* Success/Error Message */}
          {clearMessage && (
            <div
              className={`mb-4 p-3 rounded-lg ${clearMessage.type === "success"
                ? "bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200"
                : "bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
                }`}
            >
              {clearMessage.text}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unpaidInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className="bg-white dark:bg-dark-200 p-4 rounded-lg border border-red-200 dark:border-red-700"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {invoice.id}
                  </h3>
                  <span className="text-sm px-2 py-1 bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 rounded">
                    {invoice.invoiceStatus || "Unpaid"}
                  </span>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Amount: ${((invoice.remainingDue || 0) / 100).toFixed(2)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Usage: $
                  {((invoice.totalCost || 0) / 100).toFixed(2)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Calls: {invoice.totalConvs || 0}
                </p>

                {/* Action buttons */}
                <div className="flex gap-2 mt-3">
                  {/* Pay Now button */}
                  {invoice.stripeUrl && (
                    <a
                      href={invoice.stripeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center bg-primary text-white text-sm px-4 py-2 rounded hover:bg-primary-700 font-medium"
                    >
                      Pay Now
                    </a>
                  )}

                  {/* Clear button (Admin only) */}
                  {isAdmin && (
                    <button
                      onClick={() => handleClearInvoice(invoice.id)}
                      disabled={clearingInvoice === invoice.id}
                      className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white text-sm px-4 py-2 rounded font-medium transition-colors"
                    >
                      {clearingInvoice === invoice.id ? "Clearing..." : "Clear"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Balance and Usage Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Balance */}
        <div className="bg-white dark:bg-dark-200 p-6 rounded-xl border border-gray-200 dark:border-dark-100">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Current Balance
          </h2>
          <div className="flex items-center justify-between">
            <div className="flex-1 text-center">
              <p className="text-sm text-gray-500 mb-1">Balance</p>
              <p className="text-2xl font-semibold text-primary">
                ${userBalance.toFixed(2)}
              </p>
            </div>
            <div className="h-12 border-l border-gray-300 dark:border-gray-600 mx-6"></div>
            <div className="flex-1 text-center">
              <p className="text-sm text-gray-500 mb-1">Next Invoice</p>
              <p className="text-2xl font-semibold text-gray-800 dark:text-white">
                {nextInvoiceDate
                  ? formatDateToDDMMYYYY(nextInvoiceDate)
                  : getCurrentMonthLabel()}
              </p>
            </div>
          </div>
        </div>

        {/* Usage + Calls */}
        <div className="bg-white dark:bg-dark-200 p-6 rounded-xl border border-gray-200 dark:border-dark-100">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Usage Summary ({getCurrentMonthLabel()}){" "}
          </h2>
          <div className="flex items-center justify-between">
            <div className="flex-1 text-center">
              <p className="text-sm text-gray-500 mb-1">Total Usage</p>
              <p className="text-2xl font-semibold text-primary">
                ${totalUsage.toFixed(2)}
              </p>
            </div>
            <div className="h-12 border-l border-gray-300 dark:border-gray-600 mx-6"></div>
            <div className="flex-1 text-center">
              <p className="text-sm text-gray-500 mb-1">Total Calls</p>
              <p className="text-2xl font-semibold text-gray-800 dark:text-white">
                {totalCalls}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice History */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <History size={18} /> Invoice History
        </h2>
        <div className="overflow-x-auto bg-white dark:bg-dark-200 rounded-lg border border-gray-200 dark:border-dark-100">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-dark-300">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium">
                  Month
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {paidInvoices.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-8 text-gray-500 dark:text-gray-400"
                  >
                    No paid invoices yet.
                  </td>
                </tr>
              ) : (
                paidInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="hover:bg-gray-50 dark:hover:bg-dark-300/50"
                  >
                    {/* Month */}
                    <td className="px-6 py-4">{invoice.id}</td>

                    {/* Amount */}
                    <td className="px-6 py-4">
                      ${((invoice.totalCost || 0) / 100).toFixed(2)}
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4">
                      {invoice.paidAt
                        ? new Date(
                          invoice.paidAt.seconds * 1000,
                        ).toLocaleDateString()
                        : "N/A"}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 capitalize text-sm font-medium">
                      <span className="text-green-600 dark:text-green-400">
                        {invoice.invoiceStatus || "Paid"}
                      </span>
                    </td>

                    {/* Action / Details */}
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      <div>
                        Usage: ${((invoice.total_usage || 0) / 100).toFixed(2)}{" "}
                        | Calls: {invoice.total_convs || 0}
                      </div>
                      {invoice.stripeUrl && (
                        <a
                          href={invoice.stripeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-2 text-primary hover:underline"
                        >
                          Download Invoice
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Billing;
