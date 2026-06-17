import { Link } from "react-router-dom";

export default function Index() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-70"
      >
        <source
          src="https://cdn.builder.io/o/assets%2F09e7c426fe7e4e79ac16e66252169725%2F5bd8278b391945b0b9d5d7bb7f7b1099?alt=media&token=5ba55997-45ce-436b-8ff6-58760f0e562a&apiKey=09e7c426fe7e4e79ac16e66252169725"
          type="video/mp4"
        />
      </video>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header with Logo and Login Button */}
        <div className="flex items-center justify-between px-8 md:px-16 py-8">
          <h1 className="text-2xl font-bold text-white tracking-widest" style={{ fontFamily: '"DM Sans", sans-serif' }}>
            Swipe2Export
          </h1>
          <Link
            to="/login"
            className="px-6 py-2.5 bg-white hover:bg-gray-100 text-gray-900 font-semibold rounded-lg transition-colors"
          >
            Login / Sign Up
          </Link>
        </div>

        {/* Center Content */}
        <div className="flex-1 flex flex-col justify-center px-8 md:px-16 pb-32">
          <div>
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-4" style={{ fontFamily: '"Roboto Flex", sans-serif' }}>
              Connecting Global Markets,
              <br />
              One Swipe at a Time.
            </h2>
            <p className="text-2xl md:text-3xl text-amber-50/80 font-light mt-6" style={{ fontFamily: '"Roboto Flex", sans-serif' }}>
              Connect with global importers seamlessly
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
