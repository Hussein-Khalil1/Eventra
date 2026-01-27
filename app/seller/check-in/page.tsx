import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SellerCheckInList from "@/components/SellerCheckInList";

export default function SellerCheckInPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/seller"
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Scan Attendees
                </h1>
                <p className="mt-1 text-gray-500">
                  Choose an event to start check-ins.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <SellerCheckInList />
        </div>
      </div>
    </div>
  );
}
