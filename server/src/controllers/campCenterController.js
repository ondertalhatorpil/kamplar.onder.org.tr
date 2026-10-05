const { CampCenter } = require('../models');

const getAll = async (req, res) => {
  try {
    const centers = await CampCenter.findAll({
      where: { is_active: true },
      attributes: [
        'id', 'name', 'city', 'description', 'image_url', 'capacity',
        'has_breakfast', 'has_dinner',
        'breakfast_start_time', 'breakfast_end_time',
        'dinner_start_time', 'dinner_end_time'
      ],
      order: [['id', 'ASC']]
    });

    return res.json({ success: true, data: centers });
  } catch (error) {
    console.error('CampCenter getAll error:', error);
    return res.status(500).json({ success: false, message: 'Kamp merkezleri yüklenirken hata oluştu.' });
  }
};

const getById = async (req, res) => {
  try {
    const center = await CampCenter.findOne({
      where: { id: req.params.id, is_active: true }
    });

    if (!center) {
      return res.status(404).json({ success: false, message: 'Kamp merkezi bulunamadı.' });
    }

    return res.json({ success: true, data: center });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Sunucu hatası oluştu.' });
  }
};

const update = async (req, res) => {
  try {
    const center = await CampCenter.findByPk(req.params.id);
    if (!center) {
      return res.status(404).json({ success: false, message: 'Kamp merkezi bulunamadı.' });
    }

    const { name, city, description, capacity, has_breakfast, has_dinner,
      breakfast_start_time, breakfast_end_time, dinner_start_time, dinner_end_time } = req.body;

    await center.update({
      name, city, description, capacity, has_breakfast, has_dinner,
      breakfast_start_time, breakfast_end_time, dinner_start_time, dinner_end_time
    });

    return res.json({ success: true, data: center, message: 'Kamp merkezi güncellendi.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Sunucu hatası oluştu.' });
  }
};

module.exports = { getAll, getById, update };
