export default function Testimonials() {
  return (
    <section className="py-24 bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div>
            <span className="text-primary font-bold tracking-widest uppercase text-sm mb-4 block">Success Stories</span>
            <h2 className="text-4xl lg:text-5xl font-black mb-8">Loved by world-class talent.</h2>
            <div className="flex flex-col gap-10">
              <div className="flex flex-col gap-4 italic text-xl text-slate-300">
                <p>"CareerSync completely changed how I look for jobs. Instead of scrolling through thousands of irrelevant listings, I get five perfect matches every week."</p>
                <div className="flex items-center gap-4 not-italic mt-4">
                  <div className="w-12 h-12 rounded-full bg-slate-700 bg-cover bg-center" data-alt="Profile picture of Sarah Johnson" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuADwD7nalKgRU-QD0Ud-yMzxHytR0Bs_qglk3Vl8kD5nX50ixw8Dk89WMjS4HxflKSuAOWRizesWOcb-1TJbolvZn0inR3aXv-5V21yAV2ht6B48HdBhB113qBb7WGJyXRYpYQPMkVQ5Xy5zd1tbpsX4UVnTBfUwXGsueZWy3sJISbk3aohyaGKwker5j-2WOntRiU0fJj-0y-SKxs5QItsuc8tY86SbV3MQdllvsI-GBRkc4aULMqyt6koZNniVgJn5Olezpm5w4Y')" }}></div>
                  <div>
                    <p className="font-bold text-white">Sarah Johnson</p>
                    <p className="text-sm text-slate-500">Senior Product Designer @ Meta</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-slate-800 bg-cover bg-center" data-alt="Action shot of a happy worker in a modern office" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBqKPHNK7A7TONvGbMHTXbQuBThIF9lqWAr2Wl6E9RvZSCNqOlJcZ9FP4xTMW4p7YX1O0cIqepg26Kpzi545gCOlVZxi4o9L6uaMW7_ALOZVTgZLQ4_uW3I-O52fbo0PeZlVdn7yWQcyVOdq-o4pd5DlAO78GYWNPJ4P-YZFjdlRcgFjjbMRXqeOxsCr6O69SRVri7keb1RjE37FKBbk96QJ5frEDHfXnPIbET7QgDljzH00hI9IqMSrtGuZl4pezdF67YXlMIzlcU')" }}></div>
              <div className="aspect-square rounded-2xl overflow-hidden bg-slate-800 bg-cover bg-center" data-alt="Minimalist office space showing collaboration" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCFTtaY3TM9rkl34XJKBixmfyG4Mf6UIYkgl1r4DqzLTpZ1B0txcplcjWVX4DvcFzG_Lef52xblp_MwWnvHgSLEFDfVv7UN9RSXxjQN3u-LdDwMu6K4suTL1mAovevsZ7zx10DqE6sVT8zln1akQfbH3JjfkbHsWDljb55c7GumkCgRCYSaA9aawohvJioAPzY3COXH5NJrFosfs002fM8LGb1BmTL0TO3qBaMNdATxR4leA2xk2l5M5Irp_eKG1YzqaurKFADBZt4')" }}></div>
            </div>
            <div className="space-y-4 pt-12">
              <div className="aspect-square rounded-2xl overflow-hidden bg-slate-800 bg-cover bg-center" data-alt="Candidate using CareerSync mobile app" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuD9sdXabap_08_zok-0K5MUD44R3pmwsKfsGTVu1IAtFbzABRJmLX0Fdd6_jVvsgBorvtIOErlqAhernfflGZpG_uof-PgmlEd2azLjH9xRyFKq7Cx5mUGmo47meVNNmAzd0HFGk7NPmOeoIv_HmeccS1fStPZ9Kv1Xh2siGd7NRIoM2QAP_ZHeTEHjopzexKXLLqCUR_CoZ9teBa2-khhhwkJOFnJ83G7e6HiIXnOD3-FAZUGUOGBl809eoY3Z0CRqAi-4U3nbT78')" }}></div>
              <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-slate-800 bg-cover bg-center" data-alt="Team celebrating a successful hire" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCQ7l6nrdQUVhVzWaFJ1S1_oXk82151wggNP3-Fs1uMI6eAR49dix3_eE1R91nxIwmybkpYTvFUU_qpcTZ7rmiWwaOO9AbVc1lf38HK4GXFLW_BeEFZfPrE3zmutdlgKSubEY2Qbr_1wq7_yYoMdBQnX1A3n9lE6_S8AFEFflizEhHInqz4u6X3uQClkTRmuh4k-vvAWrbJSmxf4iXeBzuL-iNSBMSucI1zGKaQESe9umSoJI6kkeTQxl1PDndhtP2pBhHf90l6WJk')" }}></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
