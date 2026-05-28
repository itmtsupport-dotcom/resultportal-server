const { CertificateTemplate } = require("../models");

const createTemplate = async (req, res, next) => {
  try {
    const { name, description, templateHtml, isActive } = req.body;

    if (isActive) {
      await CertificateTemplate.update({ isActive: false }, { where: { isActive: true } });
    }

    const template = await CertificateTemplate.create({
      name,
      description,
      templateHtml,
      isActive
    });

    return res.status(201).json(template);
  } catch (error) {
    return next(error);
  }
};

const getTemplates = async (req, res, next) => {
  try {
    const templates = await CertificateTemplate.findAll({
      order: [["createdAt", "DESC"]]
    });
    return res.status(200).json(templates);
  } catch (error) {
    return next(error);
  }
};

const getTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const template = await CertificateTemplate.findByPk(id);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    return res.status(200).json(template);
  } catch (error) {
    return next(error);
  }
};

const updateTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, templateHtml, isActive } = req.body;

    const template = await CertificateTemplate.findByPk(id);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    if (isActive) {
      await CertificateTemplate.update({ isActive: false }, { where: { isActive: true } });
    }

    template.name = name;
    template.description = description;
    template.templateHtml = templateHtml;
    template.isActive = isActive;
    await template.save();

    return res.status(200).json(template);
  } catch (error) {
    return next(error);
  }
};

const deleteTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const template = await CertificateTemplate.findByPk(id);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    await template.destroy();
    return res.status(200).json({ message: "Template deleted" });
  } catch (error) {
    return next(error);
  }
};

const activateTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const template = await CertificateTemplate.findByPk(id);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    await CertificateTemplate.update({ isActive: false }, { where: { isActive: true } });
    template.isActive = true;
    await template.save();

    return res.status(200).json(template);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createTemplate,
  getTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  activateTemplate
};
